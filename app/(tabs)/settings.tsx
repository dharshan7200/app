import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, ActivityIndicator, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { uploadImage } from "../../lib/storage";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

const NOTIF_PREF_KEY = "@quickpoll_notif_enabled";

export default function SettingsScreen() {
  const router = useRouter();
  const fUser = auth.currentUser;

  const { user, completeProfile, logout } = useAuthStore();
  const { theme, setTheme } = useUiStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit profile form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  // Load preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const saved = await AsyncStorage.getItem(NOTIF_PREF_KEY);
        if (saved !== null) {
          setNotificationsEnabled(JSON.parse(saved));
        }
      } catch (e) {}
    };
    loadPrefs();
  }, []);

  const handleNotificationToggle = async (val: boolean) => {
    setNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem(NOTIF_PREF_KEY, JSON.stringify(val));
      if (fUser) {
        await updateDoc(doc(db, "users", fUser.uid), {
          notificationsEnabled: val
        });
      }
    } catch (e) {}
  };

  const handlePickAvatar = async () => {
    if (!fUser) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled && result.assets[0].uri) {
      Alert.alert("Uploading", "Updating your profile picture...");
      try {
        const url = await uploadImage(result.assets[0].uri, `users/${fUser.uid}/avatar.jpg`);
        await updateDoc(doc(db, "users", fUser.uid), {
          avatarUrl: url
        });
        // Refresh local store
        await completeProfile({
          fullName: user?.fullName || "",
          username: user?.username || "",
          bio: user?.bio || "",
          interests: user?.interests || [],
          avatarUri: result.assets[0].uri
        });
        Alert.alert("Success", "Profile photo updated successfully!");
      } catch (e) {
        Alert.alert("Failed", "Could not upload image.");
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!fUser) return;
    if (!fullName.trim() || !username.trim()) {
      Alert.alert("Error", "Name and username are required.");
      return;
    }

    setSaving(true);
    try {
      await completeProfile({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        interests: user?.interests || []
      });
      setEditModalVisible(false);
      Alert.alert("Success", "Profile details saved successfully!");
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteFriends = () => {
    Linking.openURL("sms:?body=Check%20out%20Quick%20Poll%20app%20to%20express%20opinions%20instantly:%20https://quickpoll.app");
  };

  const handleHelpSupport = () => {
    Linking.openURL("mailto:support@quickpoll.app?subject=Quick%20Poll%20Support%20Request");
  };

  const handleTermsPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://quickpoll.app/privacy");
    } catch (e) {
      Alert.alert("Error", "Could not load terms page.");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          } 
        }
      ]
    );
  };

  const handleThemeChange = (selectedTheme: typeof theme) => {
    setTheme(selectedTheme);
    Alert.alert("Theme Settings", `Theme has been updated to ${selectedTheme}.`);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-bg" edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-orange-50">
        <Text className="text-stone-900 font-extrabold text-2xl">Settings</Text>
      </View>

      <ScrollView className="flex-1 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        
        {/* User Card summary */}
        {user && (
          <View className="bg-white rounded-2xl mx-4 p-5 mb-5 border border-stone-100 flex-row items-center shadow-sm">
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-14 h-14 rounded-full bg-stone-100" />
            ) : (
              <View className="w-14 h-14 bg-brand-accent rounded-full justify-center items-center">
                <Ionicons name="person" size={24} color="#F97316" />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text className="text-stone-900 font-black text-lg">{user.fullName}</Text>
              <Text className="text-stone-400 font-bold text-xs">@{user.username}</Text>
            </View>
          </View>
        )}

        {/* PROFILE SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-4 border border-stone-100 overflow-hidden shadow-sm">
          <View className="px-4 py-2 border-b border-stone-50 bg-stone-50/50">
            <Text className="text-stone-500 font-black text-xs">Profile settings</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              setFullName(user?.fullName || "");
              setUsername(user?.username || "");
              setBio(user?.bio || "");
              setEditModalVisible(true);
            }}
            className="flex-row items-center justify-between px-5 py-4 border-b border-stone-50"
          >
            <View className="flex-row items-center">
              <Ionicons name="create-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Edit profile details</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickAvatar} className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Ionicons name="camera-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Change photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* SOCIAL SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-4 border border-stone-100 overflow-hidden shadow-sm">
          <View className="px-4 py-2 border-b border-stone-50 bg-stone-50/50">
            <Text className="text-stone-500 font-black text-xs">Social</Text>
          </View>
          
          <TouchableOpacity onPress={handleInviteFriends} className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Ionicons name="gift-outline" size={18} color="#FBBF24" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Invite friends</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* PREFERENCES SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-4 border border-stone-100 overflow-hidden shadow-sm">
          <View className="px-4 py-2 border-b border-stone-50 bg-stone-50/50">
            <Text className="text-stone-500 font-black text-xs">Preferences</Text>
          </View>
          
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-stone-50">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Push notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: "#78716C", true: "#FBBF24" }}
              thumbColor={notificationsEnabled ? "#F97316" : "#A8A29E"}
            />
          </View>

          <TouchableOpacity onPress={() => Alert.alert("Privacy settings", "Permissions are loaded from device settings.")} className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Privacy settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* APPEARANCE SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-4 border border-stone-100 overflow-hidden shadow-sm">
          <View className="px-4 py-2 border-b border-stone-50 bg-stone-50/50">
            <Text className="text-stone-500 font-black text-xs">Appearance (Theme)</Text>
          </View>
          
          <View className="flex-row bg-stone-50 border border-stone-200 rounded-2xl p-1.5 m-3 justify-between">
            {(["light", "dark", "system"] as const).map((t) => {
              const isThemeActive = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleThemeChange(t)}
                  className={`flex-1 rounded-xl py-2.5 items-center ${
                    isThemeActive ? "bg-brand-primary shadow shadow-stone-300" : ""
                  }`}
                >
                  <Text className={`font-black text-xs capitalize ${isThemeActive ? "text-white" : "text-stone-500"}`}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SUPPORT SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-4 border border-stone-100 overflow-hidden shadow-sm">
          <View className="px-4 py-2 border-b border-stone-50 bg-stone-50/50">
            <Text className="text-stone-500 font-black text-xs">Support & Legal</Text>
          </View>
          
          <TouchableOpacity onPress={handleHelpSupport} className="flex-row items-center justify-between px-5 py-4 border-b border-stone-50">
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTermsPrivacy} className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={18} color="#F97316" className="mr-3" />
              <Text className="text-stone-800 font-bold text-sm">Terms & Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* ACCOUNT ACTION SECTION */}
        <View className="bg-white rounded-2xl mx-4 mb-10 border border-stone-100 overflow-hidden shadow-sm">
          <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center py-4 bg-red-50/20 active:bg-red-50">
            <Ionicons name="log-out-outline" size={18} color="#EF4444" className="mr-2" />
            <Text className="text-red-500 font-black text-base">Log out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* EDIT PROFILE MODAL CONTAINER */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 py-3.5 border-b border-stone-100">
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={26} color="#78716C" />
            </TouchableOpacity>
            <Text className="text-stone-900 font-extrabold text-lg">Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleSaveProfile}
              disabled={saving}
              className="bg-brand-primary rounded-full px-5 py-2"
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-stone-700 font-bold text-sm mb-2">Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor="#78716C"
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3.5 rounded-2xl text-base"
              />
            </View>

            {/* Username */}
            <View className="mb-4">
              <Text className="text-stone-700 font-bold text-sm mb-2">Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#78716C"
                autoCapitalize="none"
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3.5 rounded-2xl text-base"
              />
            </View>

            {/* Bio */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-stone-700 font-bold text-sm">Bio</Text>
                <Text className="text-stone-400 text-xs">{bio.length}/150</Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={(text) => setBio(text.slice(0, 150))}
                placeholder="Intro bio..."
                placeholderTextColor="#78716C"
                multiline
                numberOfLines={3}
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-3 rounded-2xl text-base h-24"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
