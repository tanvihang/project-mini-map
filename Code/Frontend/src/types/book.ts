export type MediaStatus = "loading" | "resolved" | "error";

export interface MediaState {
  status: MediaStatus;
  url?: string;
}

export interface BookState {
  currentSpread: number;
  totalSpreads: number;
  isChatOpen: boolean;
  isPageTurning: boolean;
  narrativeProgress: number;
  mediaStates: Record<string, MediaState>;
}
