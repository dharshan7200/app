import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword, error } = useAuthStore();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6 justify-between">
        <View className="flex-grow justify-center py-6">
          
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} className="self-start mb-6">
            <Ionicons name="arrow-back" size={24} color="#F97316" />
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-extrabold text-stone-900 mb-1">
              Reset Password
            </Text>
            <Text className="text-brand-muted text-base">
              Enter your email and we'll send you instructions to reset your password.
            </Text>
          </View>

          {success ? (
            /* Success confirmation box */
            <View className="bg-brand-accent border border-brand-secondary/30 p-6 rounded-2xl mb-8 items-center">
              <View className="w-12 h-12 bg-brand-secondary rounded-full justify-center items-center mb-3">
                <Ionicons name="mail-unread-sharp" size={24} color="#7C2D12" />
              </View>
              <Text className="text-brand-dark font-extrabold text-base text-center mb-1">
                Reset Link Sent!
              </Text>
              <Text className="text-brand-dark/80 text-sm text-center">
                We've sent a password reset link to your email {email}. Please check your inbox.
              </Text>
            </View>
          ) : (
            /* Forgot Password Form */
            <View>
              <View className="mb-6">
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

              {/* Error Message */}
              {error && (
                <Text className="text-red-500 font-medium mb-4 text-center">{error}</Text>
              )}

              {/* Send Button */}
              <TouchableOpacity
                onPress={handleReset}
                disabled={loading}
                className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-brand-primary/20 active:opacity-90"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-extrabold text-lg">Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {success && (
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              className="bg-stone-100 rounded-2xl py-4 items-center justify-center active:bg-stone-200 mt-4"
            >
              <Text className="text-stone-700 font-extrabold text-lg">Back to Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
