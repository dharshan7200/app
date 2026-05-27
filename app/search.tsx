import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Poll, User } from "../types";
import PollCard from "../components/polls/PollCard";

const RECENT_SEARCH_KEY = "@quickpoll_recent_searches";

export default function SearchScreen() {
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"polls" | "people">("polls");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCH_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {}
  };

  const saveRecentSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    let updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)];
    updated = updated.slice(0, 10); // Keep top 10 recent searches
    
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleClearRecent = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCH_KEY);
    } catch (e) {}
  };

  // Run Search Query
  const executeSearch = async (textToSearch: string) => {
    const term = textToSearch.trim();
    if (!term) {
      setPolls([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === "polls") {
        const pollsRef = collection(db, "polls");
        // Simple starting-at string query
        const q = query(
          pollsRef, 
          where("question", ">=", term),
          where("question", "<=", term + "\uf8ff"),
          limit(15)
        );
        const snap = await getDocs(q);
        const results: Poll[] = [];
        snap.forEach((doc) => {
          results.push({ pollId: doc.id, ...doc.data() } as Poll);
        });
        setPolls(results);
      } else {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef, 
          where("username", ">=", term.toLowerCase()),
          where("username", "<=", term.toLowerCase() + "\uf8ff"),
          limit(15)
        );
        const snap = await getDocs(q);
        const results: User[] = [];
        snap.forEach((doc) => {
          results.push({ uid: doc.id, ...doc.data() } as User);
        });
        setUsers(results);
      }
      saveRecentSearch(term);
    } catch (e) {
      Alert.alert("Error", "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Perform search when tab changes or text changes
  useEffect(() => {
    if (searchText.trim()) {
      executeSearch(searchText);
    }
  }, [activeTab]);

  const handleSearchSubmit = () => {
    executeSearch(searchText);
  };

  const handleRecentPress = (term: string) => {
    setSearchText(term);
    executeSearch(term);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Search Input Bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-stone-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="arrow-back" size={24} color="#F97316" />
        </TouchableOpacity>
        
        <View className="flex-1 flex-row items-center bg-stone-50 border border-stone-200 rounded-full px-4 py-2">
          <Ionicons name="search" size={18} color="#F97316" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search polls, usernames..."
            placeholderTextColor="#78716C"
            autoFocus
            cursorColor="#F97316"
            className="flex-1 text-stone-900 font-semibold text-sm ml-2 p-0"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color="#78716C" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Row: Polls | People */}
      <View className="flex-row border-b border-stone-100">
        {(["polls", "people"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 items-center py-3.5 relative"
            >
              <Text className={`font-extrabold text-sm capitalize ${isActive ? "text-brand-primary" : "text-stone-500"}`}>
                {tab}
              </Text>
              {isActive && <View className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-brand-primary rounded-full" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Body Content */}
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : !searchText.trim() ? (
          /* Render Recent Searches list */
          <ScrollView className="flex-1 p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-stone-800 font-black text-sm">Recent Searches</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={handleClearRecent}>
                  <Text className="text-brand-primary font-bold text-xs">Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentSearches.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <Ionicons name="search-outline" size={36} color="#A8A29E" className="mb-2" />
                <Text className="text-stone-400 text-sm font-semibold">Your recent searches will show here.</Text>
              </View>
            ) : (
              recentSearches.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleRecentPress(item)}
                  className="flex-row items-center justify-between py-3 border-b border-stone-100"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={18} color="#78716C" className="mr-3" />
                    <Text className="text-stone-700 font-semibold text-base">{item}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#A8A29E" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : activeTab === "polls" ? (
          /* Render Poll Results */
          <FlashList
            data={polls}
            renderItem={({ item }) => <PollCard poll={item} />}
            estimatedItemSize={300}
            ListEmptyComponent={
              <View className="py-20 px-6 items-center justify-center">
                <Ionicons name="stats-chart" size={48} color="#78716C" className="mb-3" />
                <Text className="text-stone-800 font-extrabold text-lg text-center mb-1">
                  No polls found
                </Text>
                <Text className="text-stone-400 text-sm text-center">
                  Try searching for a different question or keyword.
                </Text>
              </View>
            }
          />
        ) : (
          /* Render People Results */
          <FlashList
            data={users}
            estimatedItemSize={80}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/profile/${item.uid}`)}
                className="flex-row items-center justify-between px-6 py-3.5 border-b border-stone-100"
              >
                <View className="flex-row items-center flex-1 mr-3">
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} className="w-11 h-11 rounded-full bg-stone-100" />
                  ) : (
                    <View className="w-11 h-11 bg-brand-primary/10 rounded-full justify-center items-center">
                      <Ionicons name="person" size={20} color="#F97316" />
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text className="text-stone-900 font-extrabold text-base" numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <Text className="text-stone-400 text-sm font-semibold" numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A8A29E" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="py-20 px-6 items-center justify-center">
                <Ionicons name="people" size={48} color="#78716C" className="mb-3" />
                <Text className="text-stone-800 font-extrabold text-lg text-center mb-1">
                  No users found
                </Text>
                <Text className="text-stone-400 text-sm text-center">
                  Try searching for a different username.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
