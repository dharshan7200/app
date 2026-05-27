import { initializeApp, getApps } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";


const firebaseConfig = {
  apiKey: "AIzaSyBS76Bs3KN1VAokBGoSFUg8E5jXkwrwznE",
  authDomain: "poll-6f68d.firebaseapp.com",
  databaseURL: "https://poll-6f68d-default-rtdb.firebaseio.com",
  projectId: "poll-6f68d",
  storageBucket: "poll-6f68d.firebasestorage.app",
  messagingSenderId: "932857602682",
  appId: "1:932857602682:android:1d988ca75abea5a1aa51c3"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Auth with platform-appropriate persistence
export const auth = getApps().length 
  ? getAuth(app) 
  : initializeAuth(app, {
      persistence: Platform.OS === "web"
        ? browserLocalPersistence
        : getReactNativePersistence(AsyncStorage)
    });


export const db = getApps().length
  ? getFirestore(app)
  : initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });

export const rtdb = getDatabase(app);
export const storage = getStorage(app);

