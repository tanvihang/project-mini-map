"""Service-level tests: deterministic budget guard + journey tool-loop seam."""

from __future__ import annotations

from app.core.rpc import rpc
from app.services.journey import service as journey_service


async def test_budget_blocks_when_over_ceiling():
    result = await rpc.call(
        "budget.check",
        {
            "remainingBudgetMinor": "100000",
            "remainingDays": 5,
            "estimatedCostMinor": "40000",
            "currency": "MYR",
        },
    )
    assert result["isSuccess"] is False
    assert result["errorCode"] == "ERR_BUDGET_EXHAUSTED"
    assert result["thresholdMinor"] == "30000"


async def test_budget_allows_within_ceiling():
    result = await rpc.call(
        "budget.check",
        {
            "remainingBudgetMinor": "100000",
            "remainingDays": 5,
            "estimatedCostMinor": "25000",
            "currency": "MYR",
        },
    )
    assert result["isSuccess"] is True
    assert result["approved"] is True


async def test_budget_formula_floors_once():
    """remaining=7, days=2 -> 7*3//(2*2) = 5 (the single-floor standard formula)."""
    blocked = await rpc.call(
        "budget.check",
        {
            "remainingBudgetMinor": "7",
            "remainingDays": 2,
            "estimatedCostMinor": "6",
            "currency": "MYR",
        },
    )
    allowed = await rpc.call(
        "budget.check",
        {
            "remainingBudgetMinor": "7",
            "remainingDays": 2,
            "estimatedCostMinor": "5",
            "currency": "MYR",
        },
    )
    assert blocked["isSuccess"] is False
    assert allowed["isSuccess"] is True
    assert allowed["thresholdMinor"] == "5"


async def test_journey_start_invokes_tool_loop(monkeypatch):
    """The state machine must call back into _run_agent (the tool-loop seam)."""
    calls = {}

    async def fake_run(state: dict) -> dict:
        calls["state"] = state
        return {"dayNumber": 1, "title": "stubbed", "stub": True}

    monkeypatch.setattr(journey_service, "_run_agent", fake_run)

    result = await rpc.call(
        "journey.start",
        {
            "userId": "user_abc123",
            "destination": "Kathmandu",
            "totalDays": 5,
            "totalBudgetMinor": "500000",
            "budgetCurrency": "MYR",
            "travelStyle": "slow",
            "interests": ["food", "mountains"],
        },
    )

    assert calls["state"]["destination"] == "Kathmandu"
    assert result["isSuccess"] is True
    assert result["day"]["dayNumber"] == 1
    assert result["journeyId"] == "stub-journey"


async def test_geo_reachable_degrades_to_contract_without_db():
    """Without a live DB the geo tool returns a failure contract, never raises."""
    result = await rpc.call(
        "geo.reachable",
        {"longitude": 85.3559, "latitude": 27.6966, "maxDistanceMeters": 50000},
    )
    assert result["isSuccess"] is False
    assert result["errorCode"] in {"ERR_GEOSPATIAL_EMPTY", "ERR_INTERNAL"}
