"""Shared fixtures.

The autouse fixture registers services straight into the RPC registry so async
RPC tests run without the HTTP layer or a lifespan. Gateway tests that use
TestClient still get a clean registry because the app's lifespan clears and
re-registers on startup.
"""

from __future__ import annotations

import pytest

from app.core.rpc import rpc
from app.services.budget import service as budget_service
from app.services.geo_mcp import service as geo_service
from app.services.journey import service as journey_service


@pytest.fixture(autouse=True)
def register_services():
    """Register all service RPC handlers around each test."""
    rpc.clear()

    async def ping(_payload: dict) -> dict:
        return {"pong": True, "methods": rpc.methods()}

    rpc.register("system.ping", ping)
    journey_service.register(rpc)
    budget_service.register(rpc)
    geo_service.register(rpc)
    yield
    rpc.clear()
