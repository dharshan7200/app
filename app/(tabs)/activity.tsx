import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { collection, query, orderBy, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { ActivityItem } from "../../types";

type TabType = "all" | "votes" | "comments" | "followers";

export default function ActivityScreen() {
  const router = useRouter();
  const fUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = async () => {
    if (!fUser) return;
    setLoading(true);
    try {
      const itemsRef = collection(db, "activity", fUser.uid, "items");
      const q = query(itemsRef, orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const list: ActivityItem[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ActivityItem);
      });
      setActivities(list);
    } catch (e) {
      // Return empty array on failure or lack of collection
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [fUser]);

  const handleMarkAllRead = async () => {
    if (!fUser || activities.length === 0) return;
    
    const unread = activities.filter((a) => !a.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((item) => {
        const itemRef = doc(db, "activity", fUser.uid, "items", item.id);
        batch.update(itemRef, { read: true });
      });
      await batch.commit();
      
      // Update local state
      setActivities(activities.map((a) => ({ ...a, read: true })));
    } catch (e) {}
  };

  const handleItemPress = async (item: ActivityItem) => {
    if (!fUser) return;

    // Mark as read in Firestore
    if (!item.read) {
      try {
        const itemRef = doc(db, "activity", fUser.uid, "items", item.id);
        await updateDoc(itemRef, { read: true });
        setActivities(activities.map((a) => (a.id === item.id ? { ...a, read: true } : a)));
      } catch (e) {}
    }

    // Navigate to respective route
    if (item.type === "follow") {
      router.push(`/profile/${item.fromUid}`);
    } else if (item.pollId) {
      router.push(`/poll/${item.pollId}`);
    }
  };

  // Filter activities based on tab
  const filteredActivities = activities.filter((act) => {
    if (activeTab === "all") return true;
    if (activeTab === "votes") return act.type === "vote" || act.type === "milestone";
    if (activeTab === "comments") return act.type === "comment";
    if (activeTab === "followers") return act.type === "follow";
    return true;
  });

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  const getActivityText = (item: ActivityItem) => {
    switch (item.type) {
      case "vote":
        return `${item.fromName} voted on your poll "${item.pollQuestion || "opinion"}"`;
      case "comment":
        return `${item.fromName} commented: "${item.commentPreview || "..."}"`;
      case "follow":
        return `${item.fromName} started following you`;
      case "milestone":
        return `"${item.pollQuestion}" reached ${item.milestone || 100} votes!`;
      case "group_invite":
        return `${item.fromName} invited you to join a community`;
      default:
        return "New activity update";
    }
  };

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "vote":
        return { name: "checkbox", color: "#F97316" };
      case "comment":
        return { name: "chatbubble-ellipses", color: "#FBBF24" };
      case "follow":
        return { name: "person-add", color: "#22C55E" };
      case "milestone":
        return { name: "ribbon", color: "#F97316" };
      default:
        return { name: "notifications", color: "#78716C" };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-orange-50">
        <Text className="text-stone-900 font-extrabold text-2xl">Activity</Text>
        
        {activities.some((a) => !a.read) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-brand-primary font-extrabold text-sm">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Filter Tabs */}
      <View className="flex-row bg-white border-b border-stone-100 px-4 py-2">
        {(["all", "votes", "comments", "followers"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 mr-2 ${
                isActive ? "bg-brand-primary" : "bg-stone-50 border border-stone-200"
              }`}
            >
              <Text className={`font-bold text-xs capitalize ${isActive ? "text-white" : "text-stone-500"}`}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {loading && activities.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlashList
          data={filteredActivities}
          estimatedItemSize={70}
          onRefresh={fetchActivity}
          refreshing={refreshing}
          renderItem={({ item }) => {
            const iconDetails = getActivityIcon(item.type);
            return (
              <TouchableOpacity
                onPress={() => handleItemPress(item)}
                className={`flex-row items-center px-6 py-4 border-b border-stone-50 ${
                  item.read ? "bg-white" : "bg-amber-50/50 border-l-4 border-l-brand-primary"
                }`}
              >
                {/* Avatar / Icon circle */}
                <View className="relative mr-4">
                  {item.fromAvatar ? (
                    <Image source={{ uri: item.fromAvatar }} className="w-11 h-11 rounded-full bg-stone-200" />
                  ) : (
                    <View className="w-11 h-11 bg-brand-primary/10 rounded-full justify-center items-center">
                      <Ionicons name="person" size={20} color="#F97316" />
                    </View>
                  )}
                  {/* Small badge icon */}
                  <View className="absolute -bottom-1.5 -right-1 bg-white rounded-full p-0.5 shadow shadow-stone-400">
                    <Ionicons name={iconDetails.name as any} size={11} color={iconDetails.color} />
                  </View>
                </View>

                {/* Text column */}
                <View className="flex-1 mr-2">
                  <Text className="text-stone-850 font-bold text-sm leading-normal">
                    {getActivityText(item)}
                  </Text>
                  <Text className="text-stone-400 text-[10px] font-semibold mt-1">
                    {getTimeAgo(item.timestamp)}
                  </Text>
                </View>
                
                <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="py-24 px-6 items-center justify-center">
              <Ionicons name="notifications-off-sharp" size={48} color="#78716C" className="mb-3" />
              <Text className="text-stone-900 font-extrabold text-lg text-center mb-1">
                All caught up!
              </Text>
              <Text className="text-stone-400 text-sm text-center">
                New activity updates will show up here.
              </Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}
