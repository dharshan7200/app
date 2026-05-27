import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  QueryDocumentSnapshot, 
  DocumentData 
} from "firebase/firestore";
import { db } from "./firebase";
import { Poll } from "../types";

export async function getPublicFeed(
  category: string,
  lastDocSnapshot: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<{ polls: Poll[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  try {
    const pollsRef = collection(db, "polls");
    let q;

    if (category !== "All") {
      if (lastDocSnapshot) {
        q = query(
          pollsRef,
          where("category", "==", category),
          orderBy("createdAt", "desc"),
          startAfter(lastDocSnapshot),
          limit(20)
        );
      } else {
        q = query(
          pollsRef,
          where("category", "==", category),
          orderBy("createdAt", "desc"),
          limit(20)
        );
      }
    } else {
      if (lastDocSnapshot) {
        q = query(
          pollsRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDocSnapshot),
          limit(20)
        );
      } else {
        q = query(
          pollsRef,
          orderBy("createdAt", "desc"),
          limit(20)
        );
      }
    }

    const querySnapshot = await getDocs(q);
    const polls: Poll[] = [];
    
    querySnapshot.forEach((doc) => {
      polls.push({ pollId: doc.id, ...doc.data() } as Poll);
    });

    const lastDoc = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1] 
      : null;

    return { polls, lastDoc };
  } catch (error) {
    return { polls: [], lastDoc: null };
  }
}
