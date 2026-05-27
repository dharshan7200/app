import { create } from "zustand";
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithCredential
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import { User } from "../types";

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeProfile: (profileData: {
    fullName: string;
    username: string;
    bio?: string;
    gender?: string;
    interests: string[];
    avatarUri?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void;
  setStatus: (status: "loading" | "authenticated" | "unauthenticated" | "error") => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  status: "loading",
  error: null,

  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setStatus: (status) => set({ status }),

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const fUser = credential.user;
      
      // Fetch Firestore user profile
      const userDocRef = doc(db, "users", fUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        set({ 
          firebaseUser: fUser, 
          user: userDoc.data() as User,
          status: "authenticated" 
        });
      } else {
        set({ 
          firebaseUser: fUser, 
          user: null, 
          status: "authenticated" 
        });
      }
    } catch (err: any) {
      set({ status: "error", error: err.message || "Failed to sign in" });
      throw err;
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ status: "loading", error: null });
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const fUser = result.user;

      const userDocRef = doc(db, "users", fUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        set({ 
          firebaseUser: fUser, 
          user: userDoc.data() as User,
          status: "authenticated" 
        });
      } else {
        set({ 
          firebaseUser: fUser, 
          user: null, 
          status: "authenticated" 
        });
      }
    } catch (err: any) {
      set({ status: "error", error: err.message || "Google Sign-In failed" });
      throw err;
    }
  },

  signup: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (credential.user) {
        await sendEmailVerification(credential.user);
        set({ firebaseUser: credential.user, status: "unauthenticated" });
      }
    } catch (err: any) {
      set({ status: "error", error: err.message || "Sign up failed" });
      throw err;
    }
  },

  verifyOtp: async (code) => {
    // Simulating OTP verification for Expo managed auth, or checking email verification status
    set({ status: "loading", error: null });
    try {
      const fUser = auth.currentUser;
      if (!fUser) throw new Error("No active registration found");

      // Set profile doc in Firestore with default values
      const userDocRef = doc(db, "users", fUser.uid);
      const newUser: User = {
        uid: fUser.uid,
        fullName: "",
        username: "",
        email: fUser.email || "",
        avatarUrl: "",
        bio: "",
        gender: "",
        interests: [],
        followersCount: 0,
        followingCount: 0,
        pollsCreated: 0,
        createdAt: Date.now()
      };
      
      await setDoc(userDocRef, newUser);
      set({ firebaseUser: fUser, user: newUser, status: "authenticated" });
    } catch (err: any) {
      set({ status: "error", error: err.message || "OTP verification failed" });
      throw err;
    }
  },

  resetPassword: async (email) => {
    set({ error: null });
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      set({ error: err.message || "Failed to send reset link" });
      throw err;
    }
  },

  completeProfile: async (profileData) => {
    set({ status: "loading", error: null });
    const fUser = auth.currentUser;
    if (!fUser) throw new Error("Not authenticated");

    try {
      let avatarUrl = "";
      if (profileData.avatarUri) {
        const response = await fetch(profileData.avatarUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `users/${fUser.uid}/avatar.jpg`);
        await uploadBytes(storageRef, blob);
        avatarUrl = await getDownloadURL(storageRef);
      }

      const userDocRef = doc(db, "users", fUser.uid);
      const updatedFields = {
        fullName: profileData.fullName,
        username: profileData.username,
        bio: profileData.bio || "",
        gender: profileData.gender || "",
        interests: profileData.interests,
        avatarUrl: avatarUrl || get().user?.avatarUrl || ""
      };

      await updateDoc(userDocRef, updatedFields);
      
      const refreshedUserDoc = await getDoc(userDocRef);
      const updatedUser = refreshedUserDoc.data() as User;
      
      set({ 
        user: updatedUser, 
        firebaseUser: fUser, 
        status: "authenticated" 
      });
    } catch (err: any) {
      set({ status: "error", error: err.message || "Failed to complete profile" });
      throw err;
    }
  },

  logout: async () => {
    set({ status: "loading" });
    try {
      await signOut(auth);
      set({ user: null, firebaseUser: null, status: "unauthenticated" });
    } catch (err: any) {
      set({ status: "error", error: err.message || "Failed to log out" });
      throw err;
    }
  }
}));
