// Request payload for the CHAT_SEND gateway operation.
// `sessionId` is null when starting a new conversation.
export interface ChatSendPayload {
  sessionId: string | null;
  journeyId: string;
  message: string;
}

// Best-effort response shape — refine against the live CHAT_SEND response.
export interface ChatResponse {
  sessionId: string;
  reply: string;
}
