import { create } from "zustand";
import { Poll } from "../types";

interface PollState {
  currentPoll: Poll | null;
  votedPolls: Record<string, number>; // Map of pollId -> optionIndex
  activeCategory: string;
  
  setCurrentPoll: (poll: Poll | null) => void;
  setVotedPoll: (pollId: string, optionIndex: number) => void;
  setVotedPolls: (votedPolls: Record<string, number>) => void;
  setActiveCategory: (category: string) => void;
}

export const usePollStore = create<PollState>((set) => ({
  currentPoll: null,
  votedPolls: {},
  activeCategory: "All",

  setCurrentPoll: (poll) => set({ currentPoll: poll }),
  
  setVotedPoll: (pollId, optionIndex) => set((state) => ({
    votedPolls: { ...state.votedPolls, [pollId]: optionIndex }
  })),
  
  setVotedPolls: (votedPolls) => set({ votedPolls }),
  
  setActiveCategory: (category) => set({ activeCategory: category })
}));
