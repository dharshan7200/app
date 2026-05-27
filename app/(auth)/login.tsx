import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login, status, error } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // For demo/managed flow, we suggest the Google login action
    Alert.alert("Google Sign-In", "Google Sign-In is configured using Expo Auth Session in EAS production build.");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-4 justify-between">
        <View className="flex-1 justify-center py-6">
          {/* Logo Icon */}
          <View className="items-center mb-6">
            <View className="w-14 h-14 bg-brand-primary rounded-full justify-center items-center shadow-lg shadow-brand-primary/20 mb-2">
              <Ionicons name="stats-chart" size={26} color="white" />
            </View>
            <Text className="text-stone-900 font-bold text-lg">Quick Poll</Text>
          </View>

          {/* Heading */}
          <View className="mb-8">
            <Text className="text-3xl font-extrabold text-stone-900 mb-1">
              Welcome back
            </Text>
            <Text className="text-brand-muted text-base">
              Sign in to keep tracking public opinions.
            </Text>
          </View>

          {/* Google Login */}
          <TouchableOpacity 
            onPress={handleGoogleSignIn}
            className="flex-row bg-white border border-stone-200 rounded-2xl items-center justify-center py-4 mb-6 active:bg-stone-50"
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" className="mr-3" />
            <Text className="text-stone-800 font-semibold text-base">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-[1px] bg-stone-200" />
            <Text className="px-4 text-brand-muted text-sm font-semibold">or</Text>
            <View className="flex-1 h-[1px] bg-stone-200" />
          </View>

          {/* Email input */}
          <View className="mb-4">
            <Text className="text-stone-700 font-semibold mb-2 text-sm">Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@domain.com"
              placeholderTextColor="#78716C"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base"
            />
          </View>

          {/* Password input */}
          <View className="mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-stone-700 font-semibold text-sm">Password</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                <Text className="text-brand-primary font-bold text-sm">Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View className="relative justify-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#78716C"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base pr-12"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 justify-center items-center"
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color="#F97316" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <Text className="text-red-500 font-medium mb-4 text-center">{error}</Text>
          )}

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-brand-primary/20 active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-lg">Login</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center items-center pt-4">
          <Text className="text-brand-muted text-sm">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text className="text-brand-primary font-extrabold text-sm">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
