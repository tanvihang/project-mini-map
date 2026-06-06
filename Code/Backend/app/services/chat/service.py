"""Chat service RPC implementation.

Provides conversational interaction with the travel agent. Sessions are stored
in-memory and can later be migrated to Redis/MongoDB for persistence.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from uuid import uuid4

from app.core.config import get_genai_client, get_settings
from app.core.errors import success
from app.core.rpc import RpcRegistry
from app.models.schemas import ChatMessage, ChatSendRequest, ChatSession
from app.services.chat.prompts import CHAT_SYSTEM_PROMPT

logger = logging.getLogger("minimap.chat")

# In-memory session storage. Key: session_id, Value: ChatSession
_SESSIONS: dict[str, ChatSession] = {}


def _get_or_create_session(
    session_id: str | None, journey_id: str | None
) -> ChatSession:
    """Get existing session or create a new one."""
    if session_id and session_id in _SESSIONS:
        session = _SESSIONS[session_id]
        # Update journey_id if provided
        if journey_id:
            session.journey_id = journey_id
        return session

    new_session_id = session_id or str(uuid4())
    session = ChatSession(
        session_id=new_session_id,
        journey_id=journey_id,
        messages=[],
    )
    _SESSIONS[new_session_id] = session
    return session


def _build_context(journey_id: str | None) -> str:
    """Build context string from journey state if available."""
    if not journey_id:
        return ""

    # Import here to avoid circular dependency
    from app.services.journey.service import _JOURNEYS

    state = _JOURNEYS.get(journey_id)
    if not state:
        return ""

    destination = state.get("destination", "未知目的地")
    current_day = state.get("currentDay", 0)
    total_days = state.get("totalDays", 1)
    budget_currency = state.get("budgetCurrency", "MYR")
    remaining_budget = state.get("remainingBudgetMinor", 0)
    interests = state.get("interests", [])
    travel_style = state.get("travelStyle")

    # Convert remaining budget to major units for readability
    budget_major = remaining_budget / 100 if remaining_budget else 0

    return f"""
当前旅程状态：
- 目的地：{destination}
- 当前天数：第 {current_day} 天 / 共 {total_days} 天
- 剩余预算：{budget_major:.2f} {budget_currency}
- 旅行风格：{travel_style or "未指定"}
- 兴趣：{", ".join(interests) if interests else "未指定"}
"""


async def send(payload: dict) -> dict:
    """Process a chat message and return the agent's reply."""
    req = ChatSendRequest(**payload)

    session = _get_or_create_session(req.session_id, req.journey_id)

    # Add user message to history
    user_message = ChatMessage(role="user", content=req.message)
    session.messages.append(user_message)
    session.updated_at = datetime.utcnow()

    # Build context
    context = _build_context(session.journey_id)

    # Build conversation history for LLM
    history = []
    for msg in session.messages[-10:]:  # Keep last 10 messages for context
        history.append({"role": msg.role, "content": msg.content})

    # Generate reply
    client = get_genai_client()
    if client is None:
        # Fallback: stub reply when Gemini is unavailable
        reply = _stub_reply(req.message, context)
    else:
        reply = await _generate_reply(client, context, history)

    # Add assistant message to history
    assistant_message = ChatMessage(role="assistant", content=reply)
    session.messages.append(assistant_message)
    session.updated_at = datetime.utcnow()

    # Extract suggested actions (simple heuristic)
    suggested_actions = _extract_suggested_actions(reply)

    return success(
        sessionId=session.session_id,
        reply=reply,
        suggestedActions=suggested_actions,
    )


def _stub_reply(message: str, context: str) -> str:
    """Generate a stub reply when LLM is unavailable."""
    if "咖啡" in message or "cafe" in message.lower():
        return "☕ 推荐探索当地特色咖啡馆，通常在早晨或午后时段人较少。建议预算 20-50 元/杯。"
    if "景点" in message or "推荐" in message:
        return "🏛️ 根据您的行程，建议安排半天探索核心景点，另外预留时间给慢节奏体验。"
    if "预算" in message:
        return "💰 您的预算规划合理，建议每天预留 20% 缓冲空间应对意外开销。"
    return "感谢您的提问！我目前处于离线模式，无法提供完整建议。请稍后再试。"


async def _generate_reply(
    client: Any, context: str, history: list[dict]
) -> str:
    """Call Gemini to generate a reply."""
    settings = get_settings()

    # Build the prompt
    system_prompt = CHAT_SYSTEM_PROMPT
    if context:
        system_prompt += f"\n\n{context}"

    # Build contents for the API
    contents = []
    for msg in history:
        contents.append({"role": msg["role"], "parts": [{"text": msg["content"]}]})

    def _call_gemini() -> str:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config={
                "system_instruction": system_prompt,
                "max_output_tokens": 1024,
            },
        )
        return getattr(response, "text", None) or str(response)

    try:
        return await asyncio.to_thread(_call_gemini)
    except Exception:  # noqa: BLE001
        logger.exception("gemini chat generation failed")
        return "抱歉，我暂时无法处理您的请求。请稍后再试。"


def _extract_suggested_actions(reply: str) -> list[str]:
    """Extract suggested actions from the reply (simple heuristic)."""
    actions = []

    # Look for common action patterns
    if "推荐" in reply or "建议" in reply:
        actions.append("查看推荐详情")
    if "预算" in reply:
        actions.append("调整预算")
    if "景点" in reply or "地点" in reply:
        actions.append("添加到行程")

    return actions[:3]  # Limit to 3 actions


def register(rpc: RpcRegistry) -> None:
    """Register chat service RPC methods."""
    rpc.register("chat.send", send)