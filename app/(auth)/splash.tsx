import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function SplashScreen() {
  const router = useRouter();
  const { status, user } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === "authenticated") {
        const isProfileComplete = !!(user?.fullName && user?.username);
        if (isProfileComplete) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/complete-profile");
        }
      } else if (status === "unauthenticated" || status === "error") {
        router.replace("/(auth)/login");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, user]);

  return (
    <View className="flex-1 bg-brand-bg justify-center items-center px-6">
      {/* Quick Poll Logo: orange circle with bar chart icon */}
      <View className="w-28 h-28 bg-brand-primary rounded-full justify-center items-center shadow-xl shadow-brand-primary/30 mb-6">
        <Ionicons name="stats-chart" size={54} color="white" />
      </View>
      
      <Text className="text-4xl font-extrabold text-brand-dark tracking-tight mb-2">
        Quick Poll
      </Text>
      
      <Text className="text-brand-muted text-base text-center font-medium">
        Create polls. Get opinions instantly.
      </Text>
    </View>
  );
}
