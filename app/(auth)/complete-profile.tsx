import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";

const INTEREST_OPTIONS = [
  "Tech", "Sports", "Movies", "Gaming", "Food", 
  "Fashion", "Travel", "Education", "Music", "Art"
];

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, completeProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"empty" | "checking" | "available" | "taken" | "short">("empty");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Debounced username checking
  useEffect(() => {
    if (!username) {
      setUsernameStatus("empty");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("short");
      return;
    }

    setUsernameStatus("checking");
    const delay = setTimeout(async () => {
      try {
        const normalized = username.trim().toLowerCase();
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", normalized));
        const snap = await getDocs(q);
        
        let taken = false;
        snap.forEach((doc) => {
          if (doc.id !== auth.currentUser?.uid) {
            taken = true;
          }
        });

        if (taken) {
          setUsernameStatus("taken");
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        setUsernameStatus("available");
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [username]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need storage access to select photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0].uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleToggleInterest = (item: string) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item));
    } else {
      setInterests([...interests, item]);
    }
  };

  const handleComplete = async () => {
    if (!fullName) {
      Alert.alert("Error", "Please enter your Full Name");
      return;
    }

    if (usernameStatus !== "available") {
      Alert.alert("Error", "Please select a unique and valid username");
      return;
    }

    setLoading(true);
    try {
      await completeProfile({
        fullName,
        username: username.trim().toLowerCase(),
        bio,
        gender: gender || undefined,
        interests,
        avatarUri
      });
      
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Profile Update Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-4 justify-between">
        <View className="flex-1 py-4">
          
          <View className="mb-6 items-center">
            <Text className="text-3xl font-extrabold text-stone-900 mb-1">
              Setup Profile
            </Text>
            <Text className="text-brand-muted text-base text-center">
              Personalize your profile to start expressing your views.
            </Text>
          </View>

          {/* Avatar picker */}
          <View className="items-center mb-6">
            <TouchableOpacity 
              onPress={handlePickAvatar}
              className="w-24 h-24 bg-brand-accent rounded-full border-2 border-brand-primary/20 items-center justify-center overflow-hidden relative active:opacity-90"
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="w-full h-full" />
              ) : (
                <Ionicons name="camera-sharp" size={32} color="#F97316" />
              )}
            </TouchableOpacity>
            <Text className="text-brand-primary text-xs font-bold mt-2">Upload Photo</Text>
          </View>

          {/* Full Name input */}
          <View className="mb-4">
            <Text className="text-stone-700 font-semibold mb-2 text-sm">Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#78716C"
              className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base"
            />
          </View>

          {/* Username Input (with live uniqueness checking) */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-stone-700 font-semibold text-sm">Username</Text>
              
              {usernameStatus === "checking" && <ActivityIndicator size="small" color="#F97316" />}
              {usernameStatus === "available" && (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text className="text-green-600 text-xs font-bold ml-1">Available</Text>
                </View>
              )}
              {usernameStatus === "taken" && (
                <View className="flex-row items-center">
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                  <Text className="text-red-500 text-xs font-bold ml-1">Taken</Text>
                </View>
              )}
              {usernameStatus === "short" && (
                <Text className="text-amber-600 text-xs font-bold">Too short</Text>
              )}
            </View>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. johndoe"
              placeholderTextColor="#78716C"
              autoCapitalize="none"
              className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base"
            />
          </View>

          {/* Bio area */}
          <View className="mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-stone-700 font-semibold text-sm">Bio</Text>
              <Text className="text-stone-400 text-xs">{bio.length}/150</Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, 150))}
              placeholder="Write a brief intro..."
              placeholderTextColor="#78716C"
              multiline
              numberOfLines={3}
              className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3 rounded-2xl text-base h-24"
            />
          </View>

          {/* Gender choices */}
          <View className="mb-6">
            <Text className="text-stone-700 font-semibold mb-3 text-sm">Gender (Optional)</Text>
            <View className="flex-row justify-between">
              {["Male", "Female", "Other"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setGender(item)}
                  className={`flex-1 border rounded-2xl py-3 px-2 mx-1 items-center ${
                    gender === item 
                      ? "border-brand-primary bg-brand-accent/50" 
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <Text className={`font-semibold ${gender === item ? "text-brand-dark" : "text-stone-600"}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interests Chip selection */}
          <View className="mb-8">
            <Text className="text-stone-700 font-semibold mb-3 text-sm">Select Your Interests</Text>
            <View className="flex-row flex-wrap">
              {INTEREST_OPTIONS.map((item) => {
                const selected = interests.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => handleToggleInterest(item)}
                    className={`rounded-full px-4 py-2 mr-2 mb-2 border ${
                      selected 
                        ? "bg-brand-primary border-brand-primary" 
                        : "bg-brand-accent border-amber-200"
                    }`}
                  >
                    <Text className={`font-semibold text-sm ${selected ? "text-white" : "text-brand-dark"}`}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Profile Button */}
          <TouchableOpacity
            onPress={handleComplete}
            disabled={loading}
            className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-brand-primary/20 active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-lg">Complete Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
