import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { Group, Poll, User } from "../../types";
import PollCard from "../../components/polls/PollCard";

export default function GroupDetailScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const fUser = auth.currentUser;

  const [activeTab, setActiveTab] = useState<"polls" | "members">("polls");

  // 1. Fetch Group details
  const { data: group, isLoading: groupLoading } = useQuery<Group | null>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const snap = await getDoc(doc(db, "groups", groupId));
      return snap.exists() ? (snap.data() as Group) : null;
    },
    enabled: !!groupId
  });

  // 2. Fetch Group Polls
  const { data: groupPolls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["groupPolls", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const pollsRef = collection(db, "polls");
      const q = query(pollsRef, where("groupId", "==", groupId));
      const snap = await getDocs(q);
      const list: Poll[] = [];
      snap.forEach((doc) => {
        list.push({ pollId: doc.id, ...doc.data() } as Poll);
      });
      return list;
    },
    enabled: !!groupId
  });

  // 3. Fetch Group Members profiles
  const { data: members = [], isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ["groupMembers", group?.members],
    queryFn: async () => {
      if (!group || !group.members || group.members.length === 0) return [];
      
      const list: User[] = [];
      // Firestore 'in' query caps at 30 items
      const chunks = group.members.slice(0, 30);
      for (const uid of chunks) {
        try {
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            list.push({ uid: uDoc.id, ...uDoc.data() } as User);
          }
        } catch (e) {}
      }
      return list;
    },
    enabled: !!group?.members
  });

  if (groupLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" className="mb-2" />
        <Text className="text-stone-900 font-extrabold text-lg text-center">Community not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-brand-primary rounded-2xl px-6 py-3 mt-4">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-orange-50 justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={24} color="#F97316" />
          </TouchableOpacity>
          <Text className="text-stone-900 font-extrabold text-lg flex-1" numberOfLines={1}>
            {group.name}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => Alert.alert("Invite Code", `Share this code to invite friends: ${group.inviteCode}`)}
          className="p-2 bg-stone-100 rounded-full active:bg-stone-200"
        >
          <Ionicons name="share-outline" size={18} color="#78716C" />
        </TouchableOpacity>
      </View>

      {/* Cover and details */}
      <View className="bg-white border-b border-stone-100">
        <View className="h-36 bg-stone-100 relative">
          {group.coverUrl ? (
            <Image source={{ uri: group.coverUrl }} className="w-full h-full" contentFit="cover" />
          ) : (
            <View className="w-full h-full bg-brand-accent/50 justify-center items-center">
              <Ionicons name="people" size={48} color="#FBBF24" />
            </View>
          )}
          {/* Overlay gradient text */}
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-950/60 justify-end">
            <Text className="text-white font-black text-xl mb-0.5">{group.name}</Text>
            <Text className="text-stone-200 text-xs font-semibold">{group.description}</Text>
          </View>
        </View>

        {/* Tab row: Polls | Members */}
        <View className="flex-row border-t border-stone-50">
          {(["polls", "members"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="flex-1 items-center py-3 relative"
              >
                <Text className={`font-extrabold text-sm capitalize ${isActive ? "text-brand-primary" : "text-stone-500"}`}>
                  {tab}
                </Text>
                {isActive && <View className="absolute bottom-0 left-1/3 right-1/3 h-[3px] bg-brand-primary rounded-full" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab contents */}
      <View className="flex-1">
        {activeTab === "polls" ? (
          /* Group Polls list */
          <FlashList
            data={groupPolls}
            renderItem={({ item }) => <PollCard poll={item as Poll} />}
            estimatedItemSize={300}
            ListEmptyComponent={
              pollsLoading ? (
                <View className="py-10 items-center justify-center">
                  <ActivityIndicator size="small" color="#F97316" />
                </View>
              ) : (
                <View className="py-20 px-6 items-center justify-center">
                  <Ionicons name="stats-chart" size={44} color="#78716C" className="mb-2" />
                  <Text className="text-stone-850 font-extrabold text-base text-center mb-1">
                    No community polls yet
                  </Text>
                  <Text className="text-stone-400 text-xs text-center">
                    Create the first poll dedicated to this group!
                  </Text>
                </View>
              )
            }
          />
        ) : (
          /* Group Members list */
          <FlashList
            data={members}
            estimatedItemSize={70}
            renderItem={({ item: rawItem }) => {
              const item = rawItem as User;
              return (
                <TouchableOpacity 
                  onPress={() => router.push(`/profile/${item.uid}`)}
                  className="flex-row items-center px-6 py-3.5 bg-white border-b border-stone-50 justify-between"
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
              );
            }}
            ListEmptyComponent={
              membersLoading ? (
                <View className="py-10 items-center justify-center">
                  <ActivityIndicator size="small" color="#F97316" />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* FAB: Create Poll preset to this group */}
      {fUser && group.members.includes(fUser.uid) && (
        <TouchableOpacity
          onPress={() => router.push({
            pathname: "/poll/create",
            params: { groupId: group.groupId }
          })}
          className="absolute bottom-6 right-6 bg-brand-primary rounded-full px-5 py-3 flex-row items-center justify-center shadow-lg shadow-brand-primary/40 active:scale-95"
        >
          <Ionicons name="add" size={20} color="white" className="mr-1.5" />
          <Text className="text-white font-extrabold text-sm">Create Poll</Text>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}
