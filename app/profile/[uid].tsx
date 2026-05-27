import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, FlatList, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { followUser, unfollowUser, getFollowing, getFollowers } from "../../lib/social";
import { useAuthStore } from "../../store/authStore";
import { Poll, User } from "../../types";

export default function ProfileScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const fUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<"polls" | "participated" | "saved">("polls");
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // Stats modals
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [statsModalTitle, setStatsModalTitle] = useState("");
  const [statsUserList, setStatsUserList] = useState<User[]>([]);
  const [loadingStatsList, setLoadingStatsList] = useState(false);

  const isMe = uid === fUser?.uid;

  // 1. Fetch Profile User details
  const { data: profileUser, isLoading: profileLoading, refetch: refetchProfile } = useQuery<User | null>({
    queryKey: ["profileUser", uid],
    queryFn: async () => {
      if (!uid) return null;
      const snap = await getDoc(doc(db, "users", uid));
      return snap.exists() ? (snap.data() as User) : null;
    },
    enabled: !!uid
  });

  // 2. Fetch User's Created Polls
  const { data: myPolls = [], isLoading: myPollsLoading } = useQuery<Poll[]>({
    queryKey: ["myCreatedPolls", uid],
    queryFn: async () => {
      if (!uid) return [];
      const pollsRef = collection(db, "polls");
      const q = query(pollsRef, where("createdBy", "==", uid));
      const snap = await getDocs(q);
      const list: Poll[] = [];
      snap.forEach((doc) => {
        list.push({ pollId: doc.id, ...doc.data() } as Poll);
      });
      return list;
    },
    enabled: !!uid
  });

  // 3. Fetch User's Saved Polls
  const { data: savedPolls = [], isLoading: savedPollsLoading } = useQuery<Poll[]>({
    queryKey: ["savedPolls", profileUser?.savedPolls],
    queryFn: async () => {
      const savedIds = (profileUser as any)?.savedPolls || [];
      if (savedIds.length === 0) return [];
      
      const list: Poll[] = [];
      // Fetch each poll document
      for (const pId of savedIds.slice(0, 20)) {
        try {
          const snap = await getDoc(doc(db, "polls", pId));
          if (snap.exists()) {
            list.push({ pollId: snap.id, ...snap.data() } as Poll);
          }
        } catch (e) {}
      }
      return list;
    },
    enabled: !!profileUser
  });

  // 4. Fetch Participated Polls
  const { data: participatedPolls = [], isLoading: participatedLoading } = useQuery<Poll[]>({
    queryKey: ["participatedPolls", uid],
    queryFn: async () => {
      if (!uid) return [];
      // Fetch votes subcollection for this user (where option index exists)
      const list: Poll[] = [];
      const pollsRef = collection(db, "polls");
      const snap = await getDocs(query(pollsRef, limit(30)));
      
      for (const docSnap of snap.docs) {
        try {
          // Check if user voted in this poll
          const voteDoc = await getDoc(doc(db, "votes", docSnap.id, "userVotes", uid));
          if (voteDoc.exists()) {
            list.push({ pollId: docSnap.id, ...docSnap.data() } as Poll);
          }
        } catch (e) {}
      }
      return list;
    },
    enabled: !!uid
  });

  // Check if following
  useEffect(() => {
    if (!fUser || isMe || !uid) return;
    const checkFollowingStatus = async () => {
      const myFollowing = await getFollowing(fUser.uid);
      setFollowing(myFollowing.includes(uid));
    };
    checkFollowingStatus();
  }, [uid, fUser]);

  const handleFollowToggle = async () => {
    if (!fUser || !uid) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await unfollowUser(fUser.uid, uid);
        setFollowing(false);
      } else {
        await followUser(fUser.uid, uid);
        setFollowing(true);
      }
      refetchProfile();
    } catch (e) {
      Alert.alert("Error", "Action failed.");
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleShowStatsList = async (type: "followers" | "following") => {
    if (!uid) return;
    setStatsModalTitle(type === "followers" ? "Followers" : "Following");
    setStatsModalVisible(true);
    setLoadingStatsList(true);

    try {
      const ids = type === "followers" ? await getFollowers(uid) : await getFollowing(uid);
      if (ids.length === 0) {
        setStatsUserList([]);
        setLoadingStatsList(false);
        return;
      }

      const users: User[] = [];
      for (const id of ids.slice(0, 30)) {
        const uSnap = await getDoc(doc(db, "users", id));
        if (uSnap.exists()) {
          users.push({ uid: uSnap.id, ...uSnap.data() } as User);
        }
      }
      setStatsUserList(users);
    } catch (e) {
      setStatsUserList([]);
    } finally {
      setLoadingStatsList(false);
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" className="mb-2" />
        <Text className="text-stone-900 font-extrabold text-lg text-center">User not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-brand-primary rounded-2xl px-6 py-3 mt-4">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activePollsData = activeTab === "polls" 
    ? myPolls 
    : activeTab === "participated" 
    ? participatedPolls 
    : savedPolls;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      {/* Scrollable profile layout */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Cover gradient area */}
        <View className="h-40 bg-gradient-to-r from-orange-400 to-amber-300 relative justify-end">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-4 left-4 bg-stone-900/40 p-2 rounded-full active:bg-stone-900/60 z-10">
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Profile Details Container */}
        <View className="px-6 pb-4 relative mt-[-48px] border-b border-stone-100">
          
          {/* Avatar and Action button Row */}
          <View className="flex-row justify-between items-end mb-4">
            <View className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-brand-accent shadow">
              {profileUser.avatarUrl ? (
                <Image source={{ uri: profileUser.avatarUrl }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full justify-center items-center bg-brand-accent">
                  <Ionicons name="person" size={42} color="#F97316" />
                </View>
              )}
            </View>

            {isMe ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/settings")}
                className="border border-brand-primary rounded-full px-5 py-2 active:bg-brand-accent/20"
              >
                <Text className="text-brand-primary font-extrabold text-sm">Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleFollowToggle}
                disabled={loadingFollow}
                className={`rounded-full px-6 py-2 ${
                  following ? "border border-brand-primary bg-white" : "bg-brand-primary"
                }`}
              >
                {loadingFollow ? (
                  <ActivityIndicator size="small" color={following ? "#F97316" : "white"} />
                ) : (
                  <Text className={`font-extrabold text-sm ${following ? "text-brand-primary" : "text-white"}`}>
                    {following ? "Following" : "Follow"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Name & username */}
          <Text className="text-stone-900 font-black text-2xl mb-0.5">{profileUser.fullName}</Text>
          <Text className="text-stone-400 font-bold text-sm mb-3">@{profileUser.username}</Text>
          
          {/* Bio */}
          {profileUser.bio ? (
            <Text className="text-stone-600 text-sm leading-normal mb-4 font-semibold">{profileUser.bio}</Text>
          ) : null}

          {/* Stats count Row */}
          <View className="flex-row items-center mt-2 justify-between">
            <View className="flex-row flex-1">
              <View className="mr-6">
                <Text className="text-stone-900 font-black text-base">{myPolls.length}</Text>
                <Text className="text-stone-400 text-xs font-semibold">Polls</Text>
              </View>

              <TouchableOpacity onPress={() => handleShowStatsList("followers")} className="mr-6">
                <Text className="text-stone-900 font-black text-base">{profileUser.followersCount || 0}</Text>
                <Text className="text-stone-400 text-xs font-semibold">Followers</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleShowStatsList("following")}>
                <Text className="text-stone-900 font-black text-base">{profileUser.followingCount || 0}</Text>
                <Text className="text-stone-400 text-xs font-semibold">Following</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab row: My Polls | Participated | Saved */}
        <View className="flex-row border-b border-stone-100 bg-white">
          {(["polls", "participated", "saved"] as const).map((tab) => {
            const isTabActive = activeTab === tab;
            // Only show 'Saved' if it's the current user's profile
            if (tab === "saved" && !isMe) return null;

            const labelMap = {
              polls: "My Polls",
              participated: "Voted",
              saved: "Saved"
            };

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="flex-1 items-center py-3.5 relative"
              >
                <Text className={`font-black text-xs ${isTabActive ? "text-brand-primary" : "text-stone-400"}`}>
                  {labelMap[tab]}
                </Text>
                {isTabActive && <View className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-brand-primary rounded-full" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Grid items */}
        <View className="p-3 bg-stone-50 min-h-[250px]">
          <FlatList
            data={activePollsData}
            numColumns={2}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => router.push(`/poll/${item.pollId}`)}
                className="flex-1 bg-white border border-stone-100 rounded-2xl p-4 m-1.5 justify-between min-h-[110px] shadow-sm shadow-stone-200"
              >
                <View className="bg-amber-50 rounded-full px-2 py-0.5 border border-amber-200 align-self-start self-start mb-2">
                  <Text className="text-brand-dark text-[9px] font-black capitalize">{item.category}</Text>
                </View>
                <Text className="text-stone-900 font-extrabold text-sm mb-3 leading-normal" numberOfLines={2}>
                  {item.question}
                </Text>
                <Text className="text-stone-400 font-bold text-[9px]">{item.totalVotes || 0} votes</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="py-14 items-center justify-center">
                <Ionicons name="stats-chart-outline" size={32} color="#A8A29E" className="mb-2" />
                <Text className="text-stone-400 text-xs font-semibold text-center">No polls to display here.</Text>
              </View>
            }
          />
        </View>

      </ScrollView>

      {/* STATS LIST MODAL */}
      <Modal
        visible={statsModalVisible}
        animationType="slide"
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row items-center px-4 py-3 border-b border-stone-100">
            <TouchableOpacity onPress={() => setStatsModalVisible(false)} className="p-1 mr-3">
              <Ionicons name="close" size={26} color="#78716C" />
            </TouchableOpacity>
            <Text className="text-stone-900 font-extrabold text-lg flex-1">
              {statsModalTitle}
            </Text>
          </View>

          {loadingStatsList ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="small" color="#F97316" />
            </View>
          ) : (
            <FlatList
              data={statsUserList}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setStatsModalVisible(false);
                    router.push(`/profile/${item.uid}`);
                  }}
                  className="flex-row items-center justify-between px-6 py-3.5 border-b border-stone-50"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} className="w-10 h-10 rounded-full bg-stone-100" />
                    ) : (
                      <View className="w-10 h-10 bg-brand-primary/10 rounded-full justify-center items-center">
                        <Ionicons name="person" size={18} color="#F97316" />
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="text-stone-900 font-extrabold text-sm" numberOfLines={1}>
                        {item.fullName}
                      </Text>
                      <Text className="text-stone-400 text-xs font-semibold" numberOfLines={1}>
                        @{item.username}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-20 px-6 items-center justify-center">
                  <Ionicons name="people-outline" size={44} color="#78716C" className="mb-2" />
                  <Text className="text-stone-450 font-bold text-sm text-center">List is empty.</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
