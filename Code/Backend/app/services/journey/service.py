"""Journey state machine + RPC surface.

``_run_agent`` is the single tool-loop seam: today it returns a structured stub
day; the real implementation drives the ADK agent against the geo MCP tool and
the budget service. Tests monkeypatch ``_run_agent`` to assert the state machine
calls back into it without needing live Vertex AI.
"""

from __future__ import annotations

import logging

from app.core.rpc import RpcRegistry
from app.core.rpc import rpc as _rpc
from app.models.schemas import JourneyNextDayRequest, JourneyStartRequest

logger = logging.getLogger("minimap.journey")


async def _run_agent(state: dict) -> dict:
    """Produce one journal day from the current state (stub tool-loop).

    Demonstrates inter-service RPC: it asks the geo service for reachable POIs
    (empty without a live DB) rather than importing geo_mcp directly.
    """
    geo = await _rpc.call(
        "geo.reachable",
        {
            "lng": state.get("lng", 0.0),
            "lat": state.get("lat", 0.0),
            "max_km": 50.0,
            "limit": 5,
        },
    )
    return {
        "day_number": state.get("day", 1),
        "title": f"Arrive in {state.get('destination', 'destination')}",
        "reachable_count": geo["count"],
        "stub": True,
    }


async def start(payload: dict) -> dict:
    """Begin a journey and generate Day 1."""
    req = JourneyStartRequest(**payload)
    state = {
        "destination": req.destination,
        "total_days": req.total_days,
        "day": 1,
        "lng": 0.0,
        "lat": 0.0,
    }
    day = await _run_agent(state)
    return {"journey_id": "stub-journey", "state": state, "day": day}


async def next_day(payload: dict) -> dict:
    """Advance the journey using the traveller's chosen option."""
    req = JourneyNextDayRequest(**payload)
    day = await _run_agent(
        {"destination": "continuation", "journey_id": req.journey_id, "day": 2}
    )
    return {"journey_id": req.journey_id, "chosen": req.chosen_option_id, "day": day}


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("journey.start", start)
    rpc.register("journey.next_day", next_day)
