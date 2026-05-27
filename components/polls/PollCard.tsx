import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { hasVoted, castVote } from "../../lib/voting";
import { subscribeToResults } from "../../lib/rtdb";
import { sharePost } from "../../lib/share";
import { usePollStore } from "../../store/pollStore";
import { Poll, User } from "../../types";
import ResultBar from "./ResultBar";

interface PollCardProps {
  poll: Poll;
  onDelete?: () => void;
}

export default function PollCard({ poll, onDelete }: PollCardProps) {
  const router = useRouter();
  const fUser = auth.currentUser;
  
  const { votedPolls, setVotedPoll } = usePollStore();

  const [localVoteIndex, setLocalVoteIndex] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  
  const [liveResults, setLiveResults] = useState<{
    counts: number[];
    percentages: number[];
    total: number;
  } | null>(null);

  // 1. Fetch Creator Profile via React Query
  const { data: creatorProfile } = useQuery<Partial<User>>({
    queryKey: ["user", poll.createdBy],
    queryFn: async () => {
      if (poll.createdBy === "anonymous") {
        return {
          fullName: "Anonymous Poster",
          username: "anonymous",
          avatarUrl: ""
        };
      }
      const userDoc = await getDoc(doc(db, "users", poll.createdBy));
      return userDoc.exists() ? (userDoc.data() as User) : {};
    },
    enabled: !!poll.createdBy
  });

  // 2. Fetch/Check if Current User has already voted
  useEffect(() => {
    if (!fUser) return;
    
    // Check local store first
    if (votedPolls[poll.pollId] !== undefined) {
      setLocalVoteIndex(votedPolls[poll.pollId]);
      return;
    }

    const checkVoteStatus = async () => {
      const alreadyVoted = await hasVoted(poll.pollId, fUser.uid);
      if (alreadyVoted) {
        // Find which option was voted on
        const voteDoc = await getDoc(doc(db, "votes", poll.pollId, "userVotes", fUser.uid));
        if (voteDoc.exists()) {
          const optIdx = voteDoc.data().optionIndex;
          setVotedPoll(poll.pollId, optIdx);
          setLocalVoteIndex(optIdx);
        }
      }
    };
    checkVoteStatus();
  }, [poll.pollId, fUser, votedPolls]);

  // 3. Check if Bookmarked
  useEffect(() => {
    if (!fUser) return;
    const fetchBookmarkStatus = async () => {
      const uSnap = await getDoc(doc(db, "users", fUser.uid));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        const isBookmarked = uData.savedPolls?.includes(poll.pollId) || false;
        setBookmarked(isBookmarked);
      }
    };
    fetchBookmarkStatus();
  }, [poll.pollId, fUser]);

  // 4. Subscribe to Live Realtime Database voting counts
  useEffect(() => {
    const unsubscribe = subscribeToResults(poll.pollId, (data) => {
      setLiveResults(data);
    });
    return () => unsubscribe();
  }, [poll.pollId]);

  // 5. Check if Expired
  const isExpired = poll.expiresAt ? Date.now() > poll.expiresAt : false;

  const handleVote = async () => {
    if (!fUser) {
      Alert.alert("Authentication Required", "Please log in to vote on polls.");
      return;
    }

    if (selectedOption === null) {
      Alert.alert("Selection Required", "Please select an option first.");
      return;
    }

    setVotingInProgress(true);
    try {
      await castVote(poll.pollId, fUser.uid, selectedOption);
      setLocalVoteIndex(selectedOption);
    } catch (err: any) {
      Alert.alert("Voting Failed", err.message || "Failed to submit vote.");
    } finally {
      setVotingInProgress(false);
    }
  };

  const handleBookmark = async () => {
    if (!fUser) return;
    const userRef = doc(db, "users", fUser.uid);
    try {
      if (bookmarked) {
        await updateDoc(userRef, { savedPolls: arrayRemove(poll.pollId) });
        setBookmarked(false);
      } else {
        await updateDoc(userRef, { savedPolls: arrayUnion(poll.pollId) });
        setBookmarked(true);
      }
    } catch (e) {}
  };

  // Helper to determine time differences
  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 6000);
    const days = Math.floor(hrs / 24);
    
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  // Determine winner index
  let winnerIndex = -1;
  if (liveResults && liveResults.counts.length > 0) {
    let max = -1;
    liveResults.counts.forEach((val, idx) => {
      if (val > max) {
        max = val;
        winnerIndex = idx;
      }
    });
  }

  // Voting View Model State
  const userHasVoted = localVoteIndex !== null;
  const showResults = userHasVoted || isExpired;

  return (
    <View className="bg-white rounded-2xl mx-4 my-2 p-5 border border-stone-100 shadow-sm shadow-stone-200">
      
      {/* Header Row */}
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity 
          onPress={() => poll.createdBy !== "anonymous" && router.push(`/profile/${poll.createdBy}`)}
          className="flex-row items-center flex-1 mr-3"
        >
          {creatorProfile?.avatarUrl ? (
            <Image source={{ uri: creatorProfile.avatarUrl }} className="w-9 h-9 rounded-full bg-stone-100" />
          ) : (
            <View className="w-9 h-9 bg-brand-primary/10 rounded-full justify-center items-center">
              <Ionicons name="person" size={16} color="#F97316" />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-stone-900 font-extrabold text-sm" numberOfLines={1}>
              {creatorProfile?.fullName || "Loading..."}
            </Text>
            <Text className="text-stone-400 text-xs font-semibold">
              @{creatorProfile?.username || "loading"} • {getTimeAgo(poll.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View className="flex-row items-center">
          <View className="bg-amber-50 rounded-full px-2.5 py-0.5 border border-amber-200 mr-2">
            <Text className="text-brand-dark text-xs font-bold capitalize">{poll.category}</Text>
          </View>
          {isExpired && (
            <View className="bg-stone-100 rounded-full px-2.5 py-0.5 border border-stone-200">
              <Text className="text-stone-500 text-xs font-bold">Ended</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main image attachment */}
      {poll.imageUrl && (
        <View className="w-full h-44 rounded-xl overflow-hidden mb-3 bg-stone-50">
          <Image source={{ uri: poll.imageUrl }} className="w-full h-full" contentFit="cover" />
        </View>
      )}

      {/* Question */}
      <TouchableOpacity onPress={() => router.push(`/poll/${poll.pollId}`)}>
        <Text className="text-lg font-black text-stone-900 leading-snug mb-4">
          {poll.question}
        </Text>
      </TouchableOpacity>

      {/* Options / Live Results Grid */}
      <View className="mb-4">
        {showResults ? (
          /* Render Animated ResultBars */
          poll.options.map((option, idx) => {
            const count = liveResults?.counts[idx] || 0;
            const percentage = liveResults?.percentages[idx] || 0;
            const isWinner = idx === winnerIndex;
            return (
              <ResultBar
                key={idx}
                label={option}
                percentage={percentage}
                isWinner={isWinner}
                count={count}
              />
            );
          })
        ) : votingInProgress ? (
          /* Show loading indicator */
          <View className="py-6 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="text-stone-400 text-xs font-semibold mt-2">Submitting your opinion...</Text>
          </View>
        ) : (
          /* Render Clickable Radio Options */
          <View>
            {poll.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedOption(idx)}
                  className={`flex-row items-center border rounded-2xl p-4 mb-2.5 active:bg-stone-50 ${
                    isSelected ? "border-brand-primary bg-brand-accent/30" : "border-stone-200"
                  }`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 justify-center items-center mr-3 ${
                    isSelected ? "border-brand-primary" : "border-stone-300"
                  }`}>
                    {isSelected && <View className="w-2.5 h-2.5 bg-brand-primary rounded-full" />}
                  </View>
                  <Text className={`font-semibold text-base ${isSelected ? "text-stone-900 font-extrabold" : "text-stone-700"}`}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Vote Action Trigger Button */}
            {selectedOption !== null && (
              <TouchableOpacity
                onPress={handleVote}
                className="bg-brand-primary rounded-2xl py-3.5 mt-2 items-center justify-center shadow shadow-brand-primary/20 active:opacity-95"
              >
                <Text className="text-white font-extrabold text-base">Cast Vote</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Footer statistics and controls */}
      <View className="flex-row justify-between items-center pt-3 border-t border-stone-100">
        <Text className="text-stone-400 font-bold text-xs">
          {liveResults?.total || poll.totalVotes} votes
        </Text>

        <View className="flex-row items-center">
          {/* Comments Link */}
          <TouchableOpacity 
            onPress={() => router.push(`/poll/${poll.pollId}`)}
            className="flex-row items-center mr-4 p-1"
          >
            <Ionicons name="chatbubble-outline" size={18} color="#78716C" />
            <Text className="text-stone-500 text-xs font-extrabold ml-1.5">{poll.commentCount || 0}</Text>
          </TouchableOpacity>

          {/* Native Share button */}
          <TouchableOpacity onPress={() => sharePost(poll)} className="mr-4 p-1">
            <Ionicons name="share-social-outline" size={18} color="#78716C" />
          </TouchableOpacity>

          {/* Bookmark list toggle */}
          {fUser && (
            <TouchableOpacity onPress={handleBookmark} className="p-1">
              <Ionicons 
                name={bookmarked ? "bookmark" : "bookmark-outline"} 
                size={18} 
                color={bookmarked ? "#FBBF24" : "#78716C"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

    </View>
  );
}
