import { create } from "zustand";

interface UiState {
  theme: "light" | "dark" | "system";
  isLoading: boolean;
  
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  isLoading: false,

  setTheme: (theme) => set({ theme }),
  setLoading: (loading) => set({ isLoading: loading })
}));
