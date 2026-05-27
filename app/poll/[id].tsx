import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, collection, query, where, orderBy, getDocs, setDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Poll, Comment, User } from "../../types";
import PollCard from "../../components/polls/PollCard";

export default function PollDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fUser = auth.currentUser;
  
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  // 1. Fetch Poll Details via React Query
  const { data: poll, isLoading: pollLoading, refetch: refetchPoll } = useQuery<Poll | null>({
    queryKey: ["poll", id],
    queryFn: async () => {
      if (!id) return null;
      const snap = await getDoc(doc(db, "polls", id));
      return snap.exists() ? (snap.data() as Poll) : null;
    },
    enabled: !!id
  });

  // 2. Fetch Comments via React Query
  const { data: comments = [], isLoading: commentsLoading, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ["comments", id],
    queryFn: async () => {
      if (!id) return [];
      const commentsRef = collection(db, "comments");
      const q = query(commentsRef, where("pollId", "==", id), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: Comment[] = [];
      snap.forEach((doc) => {
        list.push({ commentId: doc.id, ...doc.data() } as Comment);
      });
      return list;
    },
    enabled: !!id
  });

  // 3. Helper User Profile query for comment avatars
  const [profiles, setProfiles] = useState<Record<string, Partial<User>>>({});

  const fetchProfilesForComments = async () => {
    const uniqueUids = Array.from(new Set(comments.map((c: Comment) => c.uid))) as string[];
    const fetched: Record<string, Partial<User>> = { ...profiles };
    
    for (const uid of uniqueUids) {
      if (!fetched[uid]) {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          if (snap.exists()) {
            fetched[uid] = snap.data() as User;
          }
        } catch (e) {}
      }
    }
    setProfiles(fetched);
  };

  useEffect(() => {
    if (comments.length > 0) {
      fetchProfilesForComments();
    }
  }, [comments]);

  // 4. Submit Comment logic
  const handleSendComment = async () => {
    if (!fUser) {
      Alert.alert("Authentication Required", "Please log in to leave comments.");
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setPosting(true);
    try {
      const commentId = doc(collection(db, "comments")).id;
      const newComment: Comment = {
        commentId,
        pollId: id,
        uid: fUser.uid,
        text: trimmed,
        createdAt: Date.now()
      };

      // Save Comment doc
      await setDoc(doc(db, "comments", commentId), newComment);

      // Increment count on poll document
      await updateDoc(doc(db, "polls", id), {
        commentCount: increment(1)
      });

      setCommentText("");
      
      // Instantly refetch comment lists
      refetchComments();
      refetchPoll();
      
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  if (pollLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" className="mb-2" />
        <Text className="text-stone-900 font-extrabold text-lg text-center">Poll not found</Text>
        <Text className="text-stone-500 text-sm text-center mb-6">This poll may have been deleted or expired.</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-brand-primary rounded-2xl px-6 py-3">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const listData = [
    { type: "poll", data: poll },
    { type: "header", count: comments.length },
    ...comments.map((c: Comment) => ({ type: "comment", data: c }))
  ];

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-orange-50">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <Ionicons name="arrow-back" size={24} color="#F97316" />
        </TouchableOpacity>
        <Text className="text-stone-900 font-extrabold text-lg flex-1" numberOfLines={1}>
          Poll details
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* FlashList renders PollCard, SectionHeader and Comments in one list to optimize scroll performance */}
        <View className="flex-1">
          <FlashList
            data={listData}
            estimatedItemSize={120}
            renderItem={({ item }: { item: any }) => {
              if (item.type === "poll") {
                return <PollCard poll={item.data as Poll} />;
              }
              if (item.type === "header") {
                return (
                  <View className="px-6 py-3 bg-white mt-2 border-b border-stone-100">
                    <Text className="text-stone-800 font-black text-sm">
                      Comments ({item.count})
                    </Text>
                  </View>
                );
              }
              
              const comment = item.data as Comment;
              const profile = profiles[comment.uid] || {};
              const commentTime = new Date(comment.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              });

              return (
                <View className="flex-row px-6 py-4 bg-white border-b border-stone-50">
                  {profile.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} className="w-9 h-9 rounded-full bg-stone-100" />
                  ) : (
                    <View className="w-9 h-9 bg-brand-primary/10 rounded-full justify-center items-center">
                      <Ionicons name="person" size={16} color="#F97316" />
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-stone-900 font-extrabold text-sm">
                        {profile.fullName || "User"}
                      </Text>
                      <Text className="text-stone-400 text-[10px] font-semibold">
                        {commentTime}
                      </Text>
                    </View>
                    <Text className="text-stone-500 text-xs font-bold mb-1">
                      @{profile.username || "loading"}
                    </Text>
                    <Text className="text-stone-800 text-sm leading-normal">
                      {comment.text}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              commentsLoading ? (
                <View className="py-10 items-center justify-center">
                  <ActivityIndicator size="small" color="#F97316" />
                </View>
              ) : null
            }
          />
        </View>

        {/* Sticky comments input bar */}
        <View className="bg-white border-t border-stone-100 px-4 py-3 flex-row items-center">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Type a comment..."
            placeholderTextColor="#78716C"
            cursorColor="#F97316"
            className="flex-1 bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-2.5 rounded-full text-sm mr-3 max-h-20"
            multiline
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={posting || !commentText.trim()}
            className="w-10 h-10 bg-brand-primary rounded-full justify-center items-center shadow shadow-brand-primary/20 active:opacity-90 disabled:opacity-40"
          >
            {posting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={18} color="white" />
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
