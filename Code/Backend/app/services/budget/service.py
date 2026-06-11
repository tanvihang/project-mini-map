"""Deterministic budget guard (Backend-Coding-Standards §1.6).

No model, no randomness. The daily allowance is the ×1.5 rule written as
integer math: ``threshold = remaining × 3 // (days × 2)``. All amounts are
integer minor units carried on the wire as decimal strings.
"""

from __future__ import annotations

from app.core.errors import ERR_BUDGET_EXHAUSTED, error_contract, success
from app.core.rpc import RpcRegistry
from app.models.schemas import BudgetCheckRequest


def threshold_minor(remaining_budget_minor: int, remaining_days: int) -> int:
    """Per-day spend ceiling. ``(remaining / days) × 1.5`` as integer-only math."""
    return remaining_budget_minor * 3 // (remaining_days * 2)


async def check_budget(payload: dict) -> dict:
    """Approve, or hard-block with ERR_BUDGET_EXHAUSTED, against the ceiling."""
    req = BudgetCheckRequest(**payload)
    remaining = int(req.remaining_budget_minor)
    cost = int(req.estimated_cost_minor)
    ceiling = threshold_minor(remaining, req.remaining_days)

    if cost <= ceiling:
        return success(
            approved=True,
            thresholdMinor=str(ceiling),
            estimatedCostMinor=str(cost),
            currency=req.currency,
        )
    return {
        **error_contract(
            ERR_BUDGET_EXHAUSTED,
            f"option cost {cost} exceeds the daily ceiling {ceiling}",
        ),
        "thresholdMinor": str(ceiling),
        "estimatedCostMinor": str(cost),
        "currency": req.currency,
    }


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("budget.check", check_budget)
