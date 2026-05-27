import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { doc, setDoc, updateDoc, arrayUnion, increment, collection } from "firebase/firestore";
import { ref as dbRef, set } from "firebase/database";
import { auth, db, rtdb } from "../../lib/firebase";
import { uploadImage } from "../../lib/storage";

const CATEGORIES = ["Tech", "Movies", "Sports", "Gaming", "Food", "Fashion", "Education", "Travel", "Fun", "Trending"];
const PRIVACY_OPTIONS = [
  { label: "Public", value: "public" },
  { label: "Community", value: "community" },
  { label: "Anonymous", value: "anonymous" }
];
const EXPIRY_OPTIONS = [
  { label: "24h", value: 86400000 },
  { label: "3 days", value: 259200000 },
  { label: "7 days", value: 604800000 },
  { label: "No expiry", value: 0 }
];

export default function CreatePollScreen() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Tech");
  const [privacy, setPrivacy] = useState<"public" | "community" | "anonymous">("public");
  const [expiry, setExpiry] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 6) {
      Alert.alert("Limit Reached", "You can have a maximum of 6 options.");
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleChangeOptionText = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handlePickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const handlePublish = async () => {
    const fUser = auth.currentUser;
    if (!fUser) {
      Alert.alert("Error", "You must be logged in to publish a poll.");
      return;
    }

    // Validation
    if (!question.trim()) {
      Alert.alert("Error", "Please write a question.");
      return;
    }

    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    if (validOptions.length < 2) {
      Alert.alert("Error", "Please provide at least 2 non-empty options.");
      return;
    }

    setPublishing(true);

    try {
      // 1. Generate unique poll ID using Firestore doc reference
      const pollRef = doc(collection(db, "polls"));
      const pollId = pollRef.id;

      // 2. Upload image if selected
      let imageUrl = "";
      if (imageUri) {
        imageUrl = await uploadImage(imageUri, `polls/${pollId}/image.jpg`);
      }

      // 3. Setup expiry timestamp
      const expiresAt = expiry > 0 ? Date.now() + expiry : undefined;

      // 4. Create Poll Document in Firestore
      const newPoll = {
        pollId,
        question: question.trim(),
        options: validOptions,
        imageUrl: imageUrl || undefined,
        category: selectedCategory,
        privacy,
        expiresAt,
        createdBy: privacy === "anonymous" ? "anonymous" : fUser.uid,
        createdAt: Date.now(),
        totalVotes: 0,
        commentCount: 0
      };

      await setDoc(pollRef, newPoll);

      // 5. Setup RTDB real-time vote collection
      const rtdbVoteRef = dbRef(rtdb, `votes/${pollId}`);
      const initialCounts: Record<string, number> = {};
      validOptions.forEach((_, idx) => {
        initialCounts[`option${idx}`] = 0;
      });
      await set(rtdbVoteRef, initialCounts);

      // 6. Update user's polls records in Firestore
      const userRef = doc(db, "users", fUser.uid);
      await updateDoc(userRef, {
        polls: arrayUnion(pollId),
        pollsCreated: increment(1)
      });

      Alert.alert("Success", "Poll published successfully!", [
        { text: "OK", onPress: () => router.replace("/(tabs)") }
      ]);
    } catch (err: any) {
      Alert.alert("Publish Failed", err.message || "Failed to save poll.");
    } finally {
      setPublishing(false);
    }
  };

  const charsLeft = 200 - question.length;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-3 border-b border-stone-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={26} color="#78716C" />
        </TouchableOpacity>
        <Text className="text-stone-900 font-extrabold text-lg">Create Poll</Text>
        <TouchableOpacity 
          onPress={handlePublish}
          disabled={publishing}
          className="bg-brand-primary rounded-full px-5 py-2 items-center justify-center shadow-md shadow-brand-primary/20 active:opacity-90"
        >
          {publishing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-extrabold text-sm">Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        
        {/* Question Text Area */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-stone-700 font-bold text-sm">Your Question</Text>
            <Text className={`text-xs font-bold ${charsLeft < 20 ? "text-brand-primary" : "text-stone-400"}`}>
              {question.length}/200
            </Text>
          </View>
          <TextInput
            value={question}
            onChangeText={(text) => setQuestion(text.slice(0, 200))}
            placeholder="What's on your mind?..."
            placeholderTextColor="#78716C"
            multiline
            numberOfLines={4}
            className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base h-28"
          />
        </View>

        {/* Options List */}
        <View className="mb-6">
          <Text className="text-stone-700 font-bold text-sm mb-2">Poll Options</Text>
          {options.map((option, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <TextInput
                value={option}
                onChangeText={(text) => handleChangeOptionText(text, index)}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#78716C"
                className="flex-1 bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3.5 rounded-2xl text-base"
              />
              {options.length > 2 && (
                <TouchableOpacity 
                  onPress={() => handleRemoveOption(index)} 
                  className="ml-3 p-2 bg-stone-100 rounded-full active:bg-stone-200"
                >
                  <Ionicons name="close" size={20} color="#78716C" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Add Option Button */}
          {options.length < 6 && (
            <TouchableOpacity
              onPress={handleAddOption}
              className="border-2 border-dashed border-stone-300 rounded-2xl py-3.5 items-center justify-center flex-row active:bg-stone-50"
            >
              <Ionicons name="add" size={20} color="#F97316" className="mr-2" />
              <Text className="text-brand-primary font-bold text-base">Add Option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Image Attachment picker */}
        <View className="mb-6">
          <Text className="text-stone-700 font-bold text-sm mb-2">Add Image (Optional)</Text>
          {imageUri ? (
            <View className="relative w-full h-44 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
              <Image source={{ uri: imageUri }} className="w-full h-full" contentFit="cover" />
              <TouchableOpacity 
                onPress={handleRemoveImage}
                className="absolute top-3 right-3 bg-stone-900/60 p-2 rounded-full active:bg-stone-900/80"
              >
                <Ionicons name="trash" size={18} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handlePickImage}
              className="border-2 border-dashed border-amber-300 bg-amber-50/20 rounded-2xl py-8 items-center justify-center"
            >
              <Ionicons name="image-outline" size={32} color="#FBBF24" className="mb-2" />
              <Text className="text-brand-dark font-bold text-sm">Tap to attach a photo (16:9)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category selector */}
        <View className="mb-6">
          <Text className="text-stone-700 font-bold text-sm mb-3">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {CATEGORIES.map((item) => {
              const isSelected = selectedCategory === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedCategory(item)}
                  className={`rounded-full px-5 py-2.5 mr-2.5 border ${
                    isSelected 
                      ? "bg-brand-primary border-brand-primary" 
                      : "bg-brand-accent border-amber-200"
                  }`}
                >
                  <Text className={`font-semibold text-sm ${isSelected ? "text-white" : "text-brand-dark"}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Privacy Selector */}
        <View className="mb-6">
          <Text className="text-stone-700 font-bold text-sm mb-3">Privacy</Text>
          <View className="flex-row bg-stone-50 border border-stone-200 rounded-2xl p-1 justify-between">
            {PRIVACY_OPTIONS.map((item) => {
              const isSelected = privacy === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setPrivacy(item.value as any)}
                  className={`flex-1 rounded-xl py-3 items-center ${
                    isSelected ? "bg-white shadow shadow-stone-200" : ""
                  }`}
                >
                  <Text className={`font-bold text-sm ${isSelected ? "text-brand-primary" : "text-stone-500"}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Expiry Selector */}
        <View className="mb-10">
          <Text className="text-stone-700 font-bold text-sm mb-3">Poll Expiration</Text>
          <View className="flex-row bg-stone-50 border border-stone-200 rounded-2xl p-1 justify-between">
            {EXPIRY_OPTIONS.map((item) => {
              const isSelected = expiry === item.value;
              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setExpiry(item.value)}
                  className={`flex-1 rounded-xl py-3 items-center ${
                    isSelected ? "bg-brand-primary" : ""
                  }`}
                >
                  <Text className={`font-bold text-xs ${isSelected ? "text-white" : "text-stone-500"}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
