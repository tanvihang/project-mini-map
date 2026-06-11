"""ADK agent construction.

Built lazily and tolerantly: if google-adk or Vertex credentials are absent,
``build_root_agent`` returns None and the service runs in stub mode.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.services.journey.prompts import SYSTEM_PROMPT

logger = logging.getLogger("minimap.agent")

_root_agent: Any | None = None


def build_root_agent() -> Any | None:
    """Return a cached ADK root agent, or None if ADK is unavailable.

    To wire the MongoDB geo MCP server, add an MCPToolset that launches
    ``python -m app.services.geo_mcp.server`` and pass it in ``tools=[...]``.
    """
    global _root_agent
    if _root_agent is not None:
        return _root_agent
    try:
        from google.adk.agents import Agent
    except Exception as exc:  # noqa: BLE001 - tolerant stub mode
        logger.warning(
            "google-adk unavailable (%s); journey runs stubbed.", exc
        )
        return None

    settings = get_settings()
    _root_agent = Agent(
        name="minimap_journey_agent",
        model=settings.gemini_model,
        instruction=SYSTEM_PROMPT,
        tools=[],
    )
    return _root_agent
