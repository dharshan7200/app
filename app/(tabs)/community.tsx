import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import * as ImagePicker from "expo-image-picker";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { uploadImage } from "../../lib/storage";
import { Group } from "../../types";

export default function CommunityScreen() {
  const router = useRouter();
  const fUser = auth.currentUser;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals visibility
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  // Create group form state
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "invite">("public");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Join group form state
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchGroups = async () => {
    if (!fUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "groups"),
        where("members", "array-contains", fUser.uid)
      );
      const snap = await getDocs(q);
      const list: Group[] = [];
      snap.forEach((doc) => {
        list.push({ groupId: doc.id, ...doc.data() } as Group);
      });
      setGroups(list);
    } catch (e) {
      Alert.alert("Error", "Failed to load communities.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [fUser]);

  const handlePickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleCreateGroup = async () => {
    if (!fUser) return;
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name.");
      return;
    }

    setSubmitting(true);
    try {
      const groupId = doc(collection(db, "groups")).id;
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      let coverUrl = "";
      if (coverUri) {
        coverUrl = await uploadImage(coverUri, `groups/${groupId}/cover.jpg`);
      }

      const newGroup: Group = {
        groupId,
        name: groupName.trim(),
        description: description.trim(),
        coverUrl: coverUrl || undefined,
        ownerId: fUser.uid,
        members: [fUser.uid],
        privacy,
        inviteCode: code,
        createdAt: Date.now()
      };

      await setDoc(doc(db, "groups", groupId), newGroup);

      setCreateModalVisible(false);
      setGroupName("");
      setDescription("");
      setPrivacy("public");
      setCoverUri(null);

      Alert.alert("Success", `Community "${newGroup.name}" created! Invite code is: ${code}`);
      fetchGroups();
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message || "Failed to create group.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!fUser) return;
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert("Error", "Please type an invite code.");
      return;
    }

    setJoining(true);
    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("inviteCode", "==", code));
      const snap = await getDocs(q);

      if (snap.empty) {
        Alert.alert("Error", "Invalid invite code.");
        setJoining(false);
        return;
      }

      const matchedDoc = snap.docs[0];
      const matchedGroup = matchedDoc.data() as Group;

      if (matchedGroup.members.includes(fUser.uid)) {
        Alert.alert("Notice", "You are already a member of this community.");
        setJoinModalVisible(false);
        setInviteCode("");
        setJoining(false);
        return;
      }

      // Add to members list
      await updateDoc(doc(db, "groups", matchedDoc.id), {
        members: arrayUnion(fUser.uid)
      });

      setJoinModalVisible(false);
      setInviteCode("");
      Alert.alert("Success", `You have joined the "${matchedGroup.name}" community!`);
      fetchGroups();
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not join group.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-orange-50">
        <Text className="text-stone-900 font-extrabold text-2xl">Communities</Text>
        
        {/* Join button */}
        <TouchableOpacity 
          onPress={() => setJoinModalVisible(true)}
          className="flex-row items-center bg-brand-accent px-4 py-2 border border-amber-200 rounded-full active:opacity-90"
        >
          <Ionicons name="key" size={14} color="#7C2D12" className="mr-1" />
          <Text className="text-brand-dark font-extrabold text-xs">Join Code</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading && groups.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlashList
          data={groups}
          estimatedItemSize={180}
          onRefresh={fetchGroups}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl mx-4 my-2.5 overflow-hidden border border-stone-100 shadow-sm shadow-stone-200">
              
              {/* Cover photo */}
              <View className="h-28 bg-stone-100 relative">
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} className="w-full h-full" contentFit="cover" />
                ) : (
                  <View className="w-full h-full bg-brand-accent/50 justify-center items-center">
                    <Ionicons name="people" size={42} color="#FBBF24" />
                  </View>
                )}
                <View className="absolute top-3 left-3 bg-stone-900/60 rounded-full px-3 py-1 border border-stone-200/20">
                  <Text className="text-white text-[10px] font-extrabold capitalize">{item.privacy}</Text>
                </View>
              </View>

              {/* Text metadata */}
              <View className="p-4 flex-row justify-between items-center bg-white">
                <View className="flex-1 mr-3">
                  <Text className="text-stone-950 font-black text-lg mb-0.5" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-stone-500 text-xs font-bold">
                    {item.members?.length || 1} members
                  </Text>
                </View>
                
                {/* Open Group button */}
                <TouchableOpacity
                  onPress={() => router.push(`/group/${item.groupId}`)}
                  className="border-2 border-brand-primary rounded-xl px-4 py-2 bg-white active:bg-brand-accent/30"
                >
                  <Text className="text-brand-primary font-black text-sm">Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 px-6 items-center justify-center">
              <Ionicons name="people-sharp" size={48} color="#78716C" className="mb-3" />
              <Text className="text-stone-850 font-extrabold text-lg text-center mb-1">
                No communities yet
              </Text>
              <Text className="text-stone-400 text-sm text-center mb-6">
                Create a community or use an invite code to join one!
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                className="bg-brand-primary rounded-2xl px-6 py-3 items-center justify-center"
              >
                <Text className="text-white font-bold text-sm">Create Community</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FAB to create group */}
      {fUser && (
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-brand-primary rounded-full justify-center items-center shadow-lg shadow-brand-primary/45 active:scale-95"
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

      {/* CREATE GROUP MODAL */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-6 py-3.5 border-b border-stone-100">
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Ionicons name="close" size={26} color="#78716C" />
            </TouchableOpacity>
            <Text className="text-stone-900 font-extrabold text-lg">Create Community</Text>
            <TouchableOpacity 
              onPress={handleCreateGroup}
              disabled={submitting}
              className="bg-brand-primary rounded-full px-5 py-2"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">Create</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            {/* Cover picker */}
            <View className="mb-6">
              <Text className="text-stone-700 font-bold text-sm mb-2">Group Cover Photo</Text>
              {coverUri ? (
                <View className="relative w-full h-44 rounded-2xl overflow-hidden bg-stone-50 border border-stone-200">
                  <Image source={{ uri: coverUri }} className="w-full h-full" contentFit="cover" />
                  <TouchableOpacity 
                    onPress={() => setCoverUri(null)}
                    className="absolute top-3 right-3 bg-stone-900/60 p-2 rounded-full"
                  >
                    <Ionicons name="trash" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickCover}
                  className="border-2 border-dashed border-amber-300 bg-amber-50/20 rounded-2xl py-8 items-center justify-center"
                >
                  <Ionicons name="image-sharp" size={32} color="#FBBF24" className="mb-1" />
                  <Text className="text-brand-dark font-bold text-sm">Attach a Cover Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Group Name input */}
            <View className="mb-4">
              <Text className="text-stone-700 font-bold text-sm mb-2">Community Name</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g. Design Enthusiasts"
                placeholderTextColor="#78716C"
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3.5 rounded-2xl text-base"
              />
            </View>

            {/* Description input */}
            <View className="mb-4">
              <Text className="text-stone-700 font-bold text-sm mb-2">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What is this community about?..."
                placeholderTextColor="#78716C"
                multiline
                numberOfLines={3}
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3 rounded-2xl text-base h-24"
              />
            </View>

            {/* Privacy selections */}
            <View className="mb-8">
              <Text className="text-stone-700 font-bold text-sm mb-3">Privacy</Text>
              <View className="flex-row bg-stone-50 border border-stone-200 rounded-2xl p-1 justify-between">
                {(["public", "private", "invite"] as const).map((item) => {
                  const isSelected = privacy === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setPrivacy(item)}
                      className={`flex-1 rounded-xl py-3 items-center ${
                        isSelected ? "bg-white shadow shadow-stone-200" : ""
                      }`}
                    >
                      <Text className={`font-bold text-sm capitalize ${isSelected ? "text-brand-primary" : "text-stone-500"}`}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* JOIN CODE MODAL */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View className="flex-1 bg-stone-900/60 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 border border-stone-100 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-stone-900 font-extrabold text-lg">Join by Invite Code</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)} className="p-1">
                <Ionicons name="close" size={22} color="#78716C" />
              </TouchableOpacity>
            </View>

            <Text className="text-stone-500 text-sm mb-4 leading-normal">
              Type the 8-character invite code shared by the community owner to join.
            </Text>

            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="e.g. A8B9C1D2"
              placeholderTextColor="#78716C"
              autoCapitalize="characters"
              maxLength={8}
              className="bg-stone-50 border-2 border-stone-200 focus:border-brand-primary text-stone-950 font-bold text-center text-lg tracking-widest py-3 rounded-2xl mb-6"
            />

            <TouchableOpacity
              onPress={handleJoinByCode}
              disabled={joining}
              className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow shadow-brand-primary/20"
            >
              {joining ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-extrabold text-base">Join Community</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
