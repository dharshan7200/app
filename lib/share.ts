import { Share } from "react-native";
import { Poll } from "../types";

export async function sharePost(poll: Poll): Promise<void> {
  try {
    const url = `https://quickpoll.app/poll/${poll.pollId}`;
    const message = `${poll.question}\n\nVote now: ${url}`;
    await Share.share({
      message,
      title: poll.question
    });
  } catch (error) {
    // Silent catch
  }
}
