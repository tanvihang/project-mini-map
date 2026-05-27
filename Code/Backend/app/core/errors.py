"""Structured error contract (Backend-Coding-Standards §4).

Boundary handlers (MCP tools, gateway) MUST NOT raise to the transport — a raw
500/traceback corrupts the agent's reasoning. They return this contract instead:

    {"isSuccess": false, "errorCode": "ERR_*", "errorMessage": "...", "fallbackAction": "..."}

``errorCode`` is an UPPER_SNAKE_CASE constant from the matrix below;
``fallbackAction`` is a machine-readable recovery hint for Gemini.
"""

from __future__ import annotations

from typing import Any

# §4.2 — the single source of error codes shared with the prompt layer.
ERR_VALIDATION = "ERR_VALIDATION"
ERR_GEOSPATIAL_EMPTY = "ERR_GEOSPATIAL_EMPTY"
ERR_BUDGET_EXHAUSTED = "ERR_BUDGET_EXHAUSTED"
ERR_FX_DRIFT = "ERR_FX_DRIFT"
ERR_UNKNOWN_CURRENCY = "ERR_UNKNOWN_CURRENCY"
ERR_NOT_FOUND = "ERR_NOT_FOUND"
ERR_INTERNAL = "ERR_INTERNAL"

# Default recovery hint per code (callers may override).
FALLBACK_ACTIONS: dict[str, str] = {
    ERR_VALIDATION: "RETRY_WITH_FIXED_SCHEMA",
    ERR_GEOSPATIAL_EMPTY: "EXPAND_RADIUS",
    ERR_BUDGET_EXHAUSTED: "FORCE_SLOW_TRAVEL",
    ERR_FX_DRIFT: "REFRESH_FX_RATE",
    ERR_UNKNOWN_CURRENCY: "ASK_USER_CURRENCY",
    ERR_NOT_FOUND: "ABORT",
    ERR_INTERNAL: "ABORT",
}


def error_contract(
    code: str, message: str, fallback: str | None = None
) -> dict[str, Any]:
    """Build the structured failure result.

    ``fallback`` defaults to the recommended action for ``code``.
    """
    return {
        "isSuccess": False,
        "errorCode": code,
        "errorMessage": message,
        "fallbackAction": fallback or FALLBACK_ACTIONS.get(code, "ABORT"),
    }


def success(**fields: Any) -> dict[str, Any]:
    """Build a success result with ``isSuccess: true`` plus the given fields."""
    return {"isSuccess": True, **fields}
