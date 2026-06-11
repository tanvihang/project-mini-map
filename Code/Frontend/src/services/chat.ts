import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type { ChatResponse, ChatSendPayload } from "@/types/chat";

export function sendChat(payload: ChatSendPayload): Promise<ChatResponse> {
  return api.gateway<ChatResponse>(OPERATION_TYPES.CHAT_SEND, payload);
}
