import type { MediaStatus, MediaState } from "@/types/book";

export interface BookState {
  currentSpread: number;
  totalSpreads: number;
  isChatOpen: boolean;
  isPageTurning: boolean;
  narrativeProgress: number;
  mediaStates: Record<string, MediaState>;
}

export interface BookActions {
  nextSpread: () => void;
  prevSpread: () => void;
  goToSpread: (n: number) => void;
  toggleChat: () => void;
  setNarrativeProgress: (n: number) => void;
  startPageTurn: () => void;
  endPageTurn: () => void;
  setTotalSpreads: (n: number) => void;
  setMediaState: (ref: string, status: MediaStatus, url?: string) => void;
  resetBook: () => void;
}

export type BookStore = BookState & BookActions;
