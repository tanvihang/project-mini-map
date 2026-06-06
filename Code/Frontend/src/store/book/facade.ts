import { useBookStore } from "./store";
import type { MediaStatus } from "@/types/book";

export const bookFacade = {
  currentSpread: () => useBookStore((s) => s.currentSpread),
  totalSpreads: () => useBookStore((s) => s.totalSpreads),
  isChatOpen: () => useBookStore((s) => s.isChatOpen),
  isPageTurning: () => useBookStore((s) => s.isPageTurning),
  narrativeProgress: () => useBookStore((s) => s.narrativeProgress),
  mediaState: (ref: string) => useBookStore((s) => s.mediaStates[ref]),

  nextSpread: () => useBookStore.getState().nextSpread(),
  prevSpread: () => useBookStore.getState().prevSpread(),
  goToSpread: (n: number) => useBookStore.getState().goToSpread(n),
  toggleChat: () => useBookStore.getState().toggleChat(),
  setNarrativeProgress: (n: number) =>
    useBookStore.getState().setNarrativeProgress(n),
  startPageTurn: () => useBookStore.getState().startPageTurn(),
  endPageTurn: () => useBookStore.getState().endPageTurn(),
  setTotalSpreads: (n: number) => useBookStore.getState().setTotalSpreads(n),
  setMediaState: (ref: string, status: MediaStatus, url?: string) =>
    useBookStore.getState().setMediaState(ref, status, url),
  resetBook: () => useBookStore.getState().resetBook(),
};
