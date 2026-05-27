import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, status, error } = useAuthStore();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text.slice(-1); // Only take last character
    setCode(newCode);

    if (text && index < 5) {
      // Auto focus next box
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      // Focus previous box on backspace if current is empty
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(fullCode);
      router.push("/(auth)/complete-profile");
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(60);
    Alert.alert("Code Sent", "A new 6-digit OTP code has been sent to " + email);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6 justify-between">
        <View className="flex-grow justify-center py-6">
          
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} className="self-start mb-6">
            <Ionicons name="arrow-back" size={24} color="#F97316" />
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-extrabold text-stone-900 mb-1">
              Verify Email
            </Text>
            <Text className="text-brand-muted text-base">
              Enter the 6-digit verification code sent to {email || "your inbox"}.
            </Text>
          </View>

          {/* OTP boxes */}
          <View className="flex-row justify-between mb-8">
            {code.map((char, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                value={char}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold bg-stone-50 ${
                  focusedIndex === index ? "border-brand-primary" : "border-stone-200"
                }`}
              />
            ))}
          </View>

          {/* Error Message */}
          {error && (
            <Text className="text-red-500 font-medium mb-4 text-center">{error}</Text>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading}
            className="bg-brand-primary rounded-2xl py-4 items-center justify-center shadow-lg shadow-brand-primary/20 active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-lg">Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend Timer */}
          <View className="items-center mt-6">
            {timer > 0 ? (
              <Text className="text-brand-muted font-medium text-sm">
                Resend code in <Text className="text-brand-primary font-bold">{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text className="text-brand-primary font-extrabold text-sm">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
