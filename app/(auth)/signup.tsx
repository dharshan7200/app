import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function SignupScreen() {
  const router = useRouter();
  const { signup, error } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    if (pass.length < 6) return 1; // Weak
    if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass) && pass.length >= 8) return 3; // Strong
    return 2; // Medium
  };

  const strength = getPasswordStrength(password);

  const getStrengthBarWidth = () => {
    if (strength === 0) return "w-0";
    if (strength === 1) return "w-1/3";
    if (strength === 2) return "w-2/3";
    return "w-full";
  };

  const getStrengthBarColor = () => {
    if (strength === 1) return "bg-amber-400";
    if (strength === 2) return "bg-amber-500";
    return "bg-brand-primary"; // orange-500
  };

  const getStrengthText = () => {
    if (strength === 0) return "";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Medium";
    return "Strong";
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await signup(email.trim(), password);
      // Wait, we need to pass fullName to the OTP and profile setup
      router.push({
        pathname: "/(auth)/otp",
        params: { email: email.trim(), fullName: fullName.trim() }
      });
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
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
          <View className="mb-6">
            <Text className="text-3xl font-extrabold text-stone-900 mb-1">
              Create Account
            </Text>
            <Text className="text-brand-muted text-base">
              Join thousands of voters and speak your mind.
            </Text>
          </View>

          {/* Full Name input */}
          <View className="mb-4">
            <Text className="text-stone-700 font-semibold mb-2 text-sm">Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              placeholderTextColor="#78716C"
              className="bg-stone-50 border border-stone-200 focus:border-brand-primary text-stone-900 px-4 py-4 rounded-2xl text-base"
            />
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
            <Text className="text-stone-700 font-semibold mb-2 text-sm">Password</Text>
            <View className="relative justify-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Must be at least 6 characters"
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

            {/* Strength Bar */}
            {password.length > 0 && (
              <View className="mt-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-stone-500 text-xs font-semibold">Password Strength</Text>
                  <Text className="text-stone-700 text-xs font-bold">{getStrengthText()}</Text>
                </View>
                <View className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                  <View className={`h-full ${getStrengthBarWidth()} ${getStrengthBarColor()} rounded-full`} />
                </View>
              </View>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <Text className="text-red-500 font-medium mb-4 text-center">{error}</Text>
          )}

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-brand-primary/20 active:opacity-90 mt-2"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-lg">Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center items-center pt-4">
          <Text className="text-brand-muted text-sm">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-brand-primary font-extrabold text-sm">Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
