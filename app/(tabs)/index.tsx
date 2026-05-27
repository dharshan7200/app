import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { collection, query, limit, getDocs, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { getPublicFeed } from "../../lib/feed";
import { followUser, getFollowing } from "../../lib/social";
import { useAuthStore } from "../../store/authStore";
import { usePollStore } from "../../store/pollStore";
import { Poll, User } from "../../types";
import PollCard from "../../components/polls/PollCard";

const CATEGORIES = ["All", "Tech", "Movies", "Sports", "Gaming", "Food", "Fashion", "Education", "Travel", "Fun", "Trending"];

export default function HomeScreen() {
  const router = useRouter();
  const fUser = auth.currentUser;
  
  const { user, logout } = useAuthStore();
  const { activeCategory, setActiveCategory } = usePollStore();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Recommendations state
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // 1. Fetch Polls Feed
  const fetchFeed = async (isRefresh = false) => {
    if (loading || loadingMore) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (polls.length === 0) {
      setLoading(true);
    }

    try {
      const startDoc = isRefresh ? null : lastDoc;
      const result = await getPublicFeed(activeCategory, startDoc);
      
      if (isRefresh) {
        setPolls(result.polls);
      } else {
        // Append unique polls
        const existingIds = new Set(polls.map((p) => p.pollId));
        const filteredNewPolls = result.polls.filter((p) => !existingIds.has(p.pollId));
        setPolls([...polls, ...filteredNewPolls]);
      }
      setLastDoc(result.lastDoc);
    } catch (e) {
      Alert.alert("Error", "Failed to retrieve opinions feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // 2. Fetch People to Follow (if following < 5 users)
  const fetchSuggestions = async () => {
    if (!fUser) return;
    try {
      const myFollowing = await getFollowing(fUser.uid);
      setFollowingIds(myFollowing);

      if (myFollowing.length < 5) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(10));
        const snap = await getDocs(q);
        const users: User[] = [];
        
        snap.forEach((doc) => {
          const userData = doc.data() as User;
          if (userData.uid !== fUser.uid && !myFollowing.includes(userData.uid)) {
            users.push(userData);
          }
        });
        setSuggestedUsers(users);
      } else {
        setSuggestedUsers([]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchFeed(true);
    fetchSuggestions();
  }, [activeCategory]);

  const handleRefresh = () => {
    fetchFeed(true);
    fetchSuggestions();
  };

  const handleLoadMore = () => {
    if (lastDoc && !loadingMore && !loading) {
      setLoadingMore(true);
      fetchFeed(false);
    }
  };

  const handleFollowSuggestion = async (targetUid: string) => {
    if (!fUser) return;
    try {
      await followUser(fUser.uid, targetUid);
      setFollowingIds([...followingIds, targetUid]);
      setSuggestedUsers(suggestedUsers.filter((u) => u.uid !== targetUid));
      ToastAndroidShow("Following user successfully!");
    } catch (e) {
      Alert.alert("Error", "Could not follow user.");
    }
  };

  const ToastAndroidShow = (msg: string) => {
    Alert.alert("Social Update", msg);
  };

  // Profile Avatar Sheet options click handler
  const handleAvatarPress = () => {
    if (!fUser) {
      router.push("/(auth)/login");
      return;
    }

    Alert.alert(
      "Quick Poll Menu",
      "Manage your profile or change settings.",
      [
        { text: "My Profile", onPress: () => router.push(`/profile/${fUser.uid}`) },
        { text: "Create Poll", onPress: () => router.push("/poll/create") },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          } 
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-orange-50">
        
        {/* Search Pressable Button */}
        <TouchableOpacity 
          onPress={() => router.push("/search")}
          className="flex-1 flex-row items-center bg-stone-50 border border-stone-200 rounded-full px-4 py-2 mr-3 active:opacity-90"
        >
          <Ionicons name="search" size={18} color="#F97316" />
          <Text className="text-stone-400 font-semibold text-sm ml-2">Search polls, people...</Text>
        </TouchableOpacity>

        {/* User profile avatar */}
        <TouchableOpacity onPress={handleAvatarPress}>
          {user?.avatarUrl ? (
            <Image 
              source={{ uri: user.avatarUrl }} 
              className="w-10 h-10 rounded-full border-2 border-brand-primary bg-stone-100" 
            />
          ) : (
            <View className="w-10 h-10 rounded-full border-2 border-brand-primary bg-brand-accent justify-center items-center">
              <Ionicons name="person" size={18} color="#F97316" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Selection Carousel */}
      <View className="bg-white py-3 border-b border-orange-50">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2 mr-2 border ${
                  isSelected 
                    ? "bg-brand-primary border-brand-primary shadow-sm shadow-brand-primary/20" 
                    : "bg-brand-accent border-amber-200"
                }`}
              >
                <Text className={`font-semibold text-xs ${isSelected ? "text-white" : "text-brand-dark"}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Suggested accounts module */}
      {suggestedUsers.length > 0 && activeCategory === "All" && (
        <View className="py-4 border-b border-orange-50 bg-white">
          <Text className="text-stone-800 font-black text-sm px-4 mb-3">People to follow</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {suggestedUsers.map((item) => (
              <View 
                key={item.uid} 
                className="items-center bg-stone-50 border border-stone-200 rounded-2xl p-4 mr-3 w-32 shadow-sm"
              >
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} className="w-12 h-12 rounded-full mb-2 bg-stone-200" />
                ) : (
                  <View className="w-12 h-12 bg-amber-100 rounded-full justify-center items-center mb-2">
                    <Ionicons name="person" size={20} color="#F97316" />
                  </View>
                )}
                <Text className="text-stone-800 font-extrabold text-xs text-center mb-0.5" numberOfLines={1}>
                  {item.fullName}
                </Text>
                <Text className="text-stone-400 text-[10px] font-semibold mb-2.5" numberOfLines={1}>
                  @{item.username}
                </Text>
                <TouchableOpacity
                  onPress={() => handleFollowSuggestion(item.uid)}
                  className="bg-brand-primary rounded-full px-4 py-1 items-center justify-center"
                >
                  <Text className="text-white text-[10px] font-extrabold">Follow</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main opinions Feed */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <View className="flex-grow flex-shrink">
          <FlashList
            data={polls}
            renderItem={({ item }) => <PollCard poll={item} />}
            estimatedItemSize={380}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh} 
                tintColor="#F97316" 
                colors={["#F97316"]}
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#F97316" />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View className="py-20 px-6 items-center justify-center">
                <Ionicons name="stats-chart" size={48} color="#78716C" className="mb-3" />
                <Text className="text-stone-800 font-extrabold text-lg text-center mb-1">
                  No polls yet
                </Text>
                <Text className="text-stone-400 text-sm text-center mb-6">
                  Be the first one to create a poll in this category!
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/poll/create")}
                  className="bg-brand-primary rounded-2xl px-6 py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">Create a Poll</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* FAB (Floating Action Button) to quickly create polls */}
      {fUser && (
        <TouchableOpacity
          onPress={() => router.push("/poll/create")}
          className="absolute bottom-6 right-6 w-14 h-14 bg-brand-primary rounded-full justify-center items-center shadow-lg shadow-brand-primary/45 active:scale-95"
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}
