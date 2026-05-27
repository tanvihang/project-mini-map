"""Journey state machine + RPC surface.

``_run_agent`` is the single tool-loop seam: today it returns a structured stub
day; the real implementation drives the ADK agent against the geo MCP tool and
the budget service. Tests monkeypatch ``_run_agent`` to assert the state machine
calls back into it without needing live Vertex AI.
"""

from __future__ import annotations

import logging

from app.core.errors import success
from app.core.rpc import RpcRegistry
from app.core.rpc import rpc as _rpc
from app.models.schemas import JourneyNextDayRequest, JourneyStartRequest

logger = logging.getLogger("minimap.journey")


async def _run_agent(state: dict) -> dict:
    """Produce one journal day from the current state (stub tool-loop).

    Demonstrates inter-service RPC: it asks the geo service for reachable POIs
    rather than importing geo_mcp directly. Geo returns the structured contract,
    so we read ``candidates`` only when ``isSuccess`` is true.
    """
    lng, lat = state.get("currentLocation", [0.0, 0.0])
    geo = await _rpc.call(
        "geo.reachable",
        {"longitude": lng, "latitude": lat, "maxDistanceMeters": 50_000},
    )
    reachable = geo.get("candidates", []) if geo.get("isSuccess") else []
    return {
        "dayNumber": state.get("currentDay", 1),
        "title": f"Arrive in {state.get('destination', 'destination')}",
        "reachableCount": len(reachable),
        "stub": True,
    }


async def start(payload: dict) -> dict:
    """Begin a journey and generate Day 1."""
    req = JourneyStartRequest(**payload)
    state = {
        "destination": req.destination,
        "totalDays": req.total_days,
        "currentDay": 1,
        "budgetCurrency": req.budget_currency,
        "remainingBudgetMinor": int(req.total_budget_minor),
        "currentLocation": [0.0, 0.0],
    }
    day = await _run_agent(state)
    return success(journeyId="stub-journey", state=state, day=day)


async def next_day(payload: dict) -> dict:
    """Advance the journey using the traveller's chosen option index."""
    req = JourneyNextDayRequest(**payload)
    day = await _run_agent(
        {
            "destination": "continuation",
            "currentDay": 2,
            "currentLocation": [0.0, 0.0],
        }
    )
    return success(
        journeyId=req.journey_id, chosenIndex=req.chosen_index, day=day
    )


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("journey.start", start)
    rpc.register("journey.next_day", next_day)
