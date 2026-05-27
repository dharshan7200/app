import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";
import { auth, db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, status, setUser, setFirebaseUser, setStatus } = useAuthStore();
  const segments = useSegments() as string[];
  const router = useRouter();

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      if (fUser) {
        setFirebaseUser(fUser);
        try {
          const userDocRef = doc(db, "users", fUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setUser(userDocSnap.data() as any);
          } else {
            setUser(null);
          }
          setStatus("authenticated");
        } catch (error) {
          setUser(null);
          setStatus("authenticated");
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    });

    return unsubscribe;
  }, []);

  // Root Navigation Router Guard
  useEffect(() => {
    if (status === "loading") return;

    const inAuthGroup = segments[0] === "(auth)";
    const inSplash = segments[1] === "splash";
    
    if (status === "unauthenticated") {
      if (!inAuthGroup) {
        router.replace("/(auth)/splash");
      }
    } else if (status === "authenticated") {
      const isProfileComplete = !!(user?.fullName && user?.username);
      
      if (!isProfileComplete) {
        if (segments[1] !== "complete-profile") {
          router.replace("/(auth)/complete-profile");
        }
      } else {
        if (inAuthGroup && !inSplash) {
          router.replace("/(tabs)");
        }
      }
    }
  }, [status, user, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="poll/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="poll/create" options={{ presentation: "modal" }} />
        <Stack.Screen name="profile/[uid]" />
        <Stack.Screen name="group/[groupId]" />
        <Stack.Screen name="search" options={{ presentation: "modal" }} />
      </Stack>
      <Toast />
    </QueryClientProvider>
  );
}
