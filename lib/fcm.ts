import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function registerForPushNotificationsAsync(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // Get the Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save token to Firestore
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      expoPushToken: token
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#F97316"
      });
    }

    return token;
  } catch (error) {
    return null;
  }
}
