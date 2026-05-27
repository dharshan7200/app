import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface ResultBarProps {
  label: string;
  percentage: number;
  isWinner: boolean;
  count: number;
}

export default function ResultBar({ label, percentage, isWinner, count }: ResultBarProps) {
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    // Keep width clamped between 0 and 100
    const targetWidth = Math.max(0, Math.min(100, percentage));
    widthAnim.value = withSpring(targetWidth, { damping: 14, stiffness: 90 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthAnim.value}%`
    };
  });

  return (
    <View className="mb-4">
      {/* Label and statistics row */}
      <View className="flex-row justify-between items-center mb-1.5 px-1">
        <View className="flex-row items-center flex-1 pr-2">
          <Text className="text-stone-900 font-semibold text-sm mr-2 flex-shrink" numberOfLines={1}>
            {label}
          </Text>
          {isWinner && percentage > 0 && (
            <View className="bg-brand-primary rounded-full px-2 py-0.5">
              <Text className="text-white text-[10px] font-extrabold">Leading</Text>
            </View>
          )}
        </View>
        <Text className="text-stone-700 font-bold text-sm">
          {percentage.toFixed(0)}% <Text className="text-stone-400 text-xs font-medium">({count})</Text>
        </Text>
      </View>

      {/* Progress Track */}
      <View className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
        <Animated.View 
          className={`h-full rounded-full ${isWinner ? "bg-brand-primary" : "bg-brand-secondary"}`}
          style={animatedStyle}
        />
      </View>
    </View>
  );
}
