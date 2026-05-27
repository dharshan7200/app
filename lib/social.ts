import { doc, writeBatch, increment, collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "./firebase";

export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);
  const timestamp = Date.now();

  // Set following record for current user
  const followingRef = doc(db, "followers", currentUid, "following", targetUid);
  batch.set(followingRef, { timestamp });

  // Set follower record for target user
  const followerRef = doc(db, "followers", targetUid, "followers", currentUid);
  batch.set(followerRef, { timestamp });

  // Update counts on both profiles
  const currentUserRef = doc(db, "users", currentUid);
  batch.update(currentUserRef, { followingCount: increment(1) });

  const targetUserRef = doc(db, "users", targetUid);
  batch.update(targetUserRef, { followersCount: increment(1) });

  await batch.commit();
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete records
  const followingRef = doc(db, "followers", currentUid, "following", targetUid);
  batch.delete(followingRef);

  const followerRef = doc(db, "followers", targetUid, "followers", currentUid);
  batch.delete(followerRef);

  // Decrement counts on both profiles
  const currentUserRef = doc(db, "users", currentUid);
  batch.update(currentUserRef, { followingCount: increment(-1) });

  const targetUserRef = doc(db, "users", targetUid);
  batch.update(targetUserRef, { followersCount: increment(-1) });

  await batch.commit();
}

export async function getFollowers(uid: string): Promise<string[]> {
  const followersRef = collection(db, "followers", uid, "followers");
  const q = query(followersRef, limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.id);
}

export async function getFollowing(uid: string): Promise<string[]> {
  const followingRef = collection(db, "followers", uid, "following");
  const q = query(followingRef, limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.id);
}
