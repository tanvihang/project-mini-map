"""Deterministic budget guard.

No model, no randomness: an option is approved only if its cost stays within
``(remaining_budget / remaining_days) * 1.5``. All math is in integer minor
units so the verdict is exact and reproducible.
"""

from __future__ import annotations

from app.core.rpc import RpcRegistry
from app.models.schemas import BudgetCheckRequest, BudgetCheckResult


def _ceiling_minor(remaining_minor: int, remaining_days: int) -> int:
    """Per-day spend ceiling = (remaining / days) * 1.5, integer minor units."""
    per_day = remaining_minor // remaining_days
    return per_day * 3 // 2


async def check_budget(payload: dict) -> dict:
    """Approve or hard-block one option against the per-day ceiling."""
    req = BudgetCheckRequest(**payload)
    ceiling = _ceiling_minor(req.remaining_minor, req.remaining_days)
    approved = req.option_cost_minor <= ceiling
    reason = (
        "within per-day ceiling"
        if approved
        else f"cost {req.option_cost_minor} exceeds ceiling {ceiling}"
    )
    return BudgetCheckResult(
        approved=approved,
        ceiling_minor=ceiling,
        option_cost_minor=req.option_cost_minor,
        currency=req.currency,
        reason=reason,
    ).model_dump()


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("budget.check", check_budget)
