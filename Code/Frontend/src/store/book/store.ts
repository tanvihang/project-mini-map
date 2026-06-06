import { create } from "zustand";
import type { BookStore } from "./types";
import type { MediaStatus } from "@/types/book";

const initialState = {
  currentSpread: 0,
  totalSpreads: 0,
  isChatOpen: false,
  isPageTurning: false,
  narrativeProgress: 0,
  mediaStates: {} as Record<string, { status: "loading" | "resolved" | "error"; url?: string }>,
};

export const useBookStore = create<BookStore>()((set) => ({
  ...initialState,

  nextSpread: () =>
    set((s) => ({
      currentSpread: Math.min(s.currentSpread + 1, s.totalSpreads - 1),
    })),

  prevSpread: () =>
    set((s) => ({
      currentSpread: Math.max(s.currentSpread - 1, 0),
    })),

  goToSpread: (n) => set({ currentSpread: n }),

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),

  setNarrativeProgress: (n) => set({ narrativeProgress: n }),

  startPageTurn: () => set({ isPageTurning: true }),

  endPageTurn: () => set({ isPageTurning: false }),

  setTotalSpreads: (n) => set({ totalSpreads: n }),

  setMediaState: (ref, status, url) =>
    set((s) => ({
      mediaStates: {
        ...s.mediaStates,
        [ref]: { status, url: url as MediaStatus extends "resolved" ? string : undefined },
      },
    })),

  resetBook: () => set(initialState),
}));
