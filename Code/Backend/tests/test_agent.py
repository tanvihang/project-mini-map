"""Service-level tests: deterministic budget guard + journey tool-loop seam."""

from __future__ import annotations

from app.core.rpc import rpc
from app.services.journey import service as journey_service


async def test_budget_blocks_when_over_ceiling():
    result = await rpc.call(
        "budget.check",
        {
            "remaining_minor": 100000,
            "remaining_days": 5,
            "option_cost_minor": 40000,
            "currency": "MYR",
        },
    )
    # ceiling = (100000 // 5) * 3 // 2 = 30000
    assert result["approved"] is False
    assert result["ceiling_minor"] == 30000


async def test_budget_allows_within_ceiling():
    result = await rpc.call(
        "budget.check",
        {
            "remaining_minor": 100000,
            "remaining_days": 5,
            "option_cost_minor": 25000,
            "currency": "MYR",
        },
    )
    assert result["approved"] is True


async def test_journey_start_invokes_tool_loop(monkeypatch):
    """The state machine must call back into _run_agent (the tool-loop seam)."""
    calls = {}

    async def fake_run(state: dict) -> dict:
        calls["state"] = state
        return {"day_number": 1, "title": "stubbed", "stub": True}

    monkeypatch.setattr(journey_service, "_run_agent", fake_run)

    result = await rpc.call(
        "journey.start",
        {
            "destination": "Kathmandu",
            "total_days": 5,
            "total_budget": {"currency": "MYR", "exponent": 2, "minor_units": 500000},
            "style": "slow",
            "interests": ["food", "mountains"],
        },
    )

    assert calls["state"]["destination"] == "Kathmandu"
    assert result["day"]["day_number"] == 1
    assert result["journey_id"] == "stub-journey"


async def test_geo_reachable_tolerates_missing_db():
    """Without a live DB the geo query degrades to an empty set, not a crash."""
    result = await rpc.call(
        "geo.reachable", {"lng": 85.3559, "lat": 27.6966, "max_km": 50, "limit": 5}
    )
    assert result["count"] == 0
    assert result["locations"] == []
