import { ref, onValue } from "firebase/database";
import { rtdb } from "./firebase";

export function subscribeToResults(
  pollId: string,
  callback: (data: { counts: number[]; percentages: number[]; total: number }) => void
) {
  const votesRef = ref(rtdb, `votes/${pollId}`);
  
  return onValue(votesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback({ counts: [], percentages: [], total: 0 });
      return;
    }

    const counts: number[] = [];
    let index = 0;
    
    while (data[`option${index}`] !== undefined) {
      counts.push(data[`option${index}`]);
      index++;
    }

    const total = counts.reduce((sum, val) => sum + val, 0);
    const percentages = counts.map((c) => (total > 0 ? (c / total) * 100 : 0));
    
    callback({ counts, percentages, total });
  });
}
