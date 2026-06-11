"""In-process async RPC dispatch.

This is the only channel services use to call each other. Callers reference a
string method name (e.g. ``"budget.check"``) and never import the target
service — the same location transparency a Java RPC/gRPC stub gives you. The
in-process registry can later be swapped for a network transport without
touching any caller.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

Handler = Callable[[dict], Awaitable[Any]]


class RpcError(Exception):
    """Base class for RPC failures."""


class MethodNotFoundError(RpcError):
    """Raised when no handler is registered for a method name."""


class RpcRegistry:
    """Maps ``"service.method"`` names to async handlers."""

    def __init__(self) -> None:
        self._handlers: dict[str, Handler] = {}

    def register(self, method: str, handler: Handler) -> None:
        """Register (or replace) the handler for ``method``."""
        self._handlers[method] = handler

    def has(self, method: str) -> bool:
        """Return whether a handler exists for ``method``."""
        return method in self._handlers

    def methods(self) -> list[str]:
        """Return all registered method names, sorted."""
        return sorted(self._handlers)

    def clear(self) -> None:
        """Drop all registrations (used on startup and in tests)."""
        self._handlers.clear()

    async def call(self, method: str, payload: dict) -> Any:
        """Invoke ``method`` with ``payload`` and await its result."""
        handler = self._handlers.get(method)
        if handler is None:
            raise MethodNotFoundError(method)
        return await handler(payload)


# Process-wide registry. Services register against this at startup.
rpc = RpcRegistry()
