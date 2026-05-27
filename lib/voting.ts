import { doc, getDoc, writeBatch, increment } from "firebase/firestore";
import { ref, runTransaction } from "firebase/database";
import { db, rtdb } from "./firebase";
import { usePollStore } from "../store/pollStore";

export async function hasVoted(pollId: string, uid: string): Promise<boolean> {
  try {
    const voteDocRef = doc(db, "votes", pollId, "userVotes", uid);
    const docSnap = await getDoc(voteDocRef);
    return docSnap.exists();
  } catch (error) {
    return false;
  }
}

export async function castVote(pollId: string, uid: string, optionIndex: number): Promise<void> {
  const voted = await hasVoted(pollId, uid);
  if (voted) {
    throw new Error("already voted");
  }

  // 1. Write Firestore vote record & increment count in a batch
  const batch = writeBatch(db);
  const voteDocRef = doc(db, "votes", pollId, "userVotes", uid);
  const pollDocRef = doc(db, "polls", pollId);

  batch.set(voteDocRef, {
    uid,
    optionIndex,
    timestamp: Date.now()
  });

  batch.update(pollDocRef, {
    totalVotes: increment(1)
  });

  await batch.commit();

  // 2. Realtime DB atomic increment
  const rtdbRef = ref(rtdb, `votes/${pollId}/option${optionIndex}`);
  await runTransaction(rtdbRef, (currentValue) => {
    return (currentValue || 0) + 1;
  });

  // 3. Update store state
  usePollStore.getState().setVotedPoll(pollId, optionIndex);
}
