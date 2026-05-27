"""Standalone FastMCP server exposing geo tools over MCP (stdio transport).

Run it so an ADK agent can connect via MCPToolset:

    python -m app.services.geo_mcp.server

This is the MongoDB MCP integration point: the agent calls a typed, guarded
tool (``get_reachable_locations``) and can never issue a raw query that bypasses
the geographic reachability constraint.
"""

from __future__ import annotations

from fastmcp import FastMCP

from app.services.geo_mcp.service import query_reachable

mcp = FastMCP("minimap-geo")


@mcp.tool
async def get_reachable_locations(
    lng: float, lat: float, max_km: float = 200.0, limit: int = 20
) -> list[dict]:
    """Return POIs within ``max_km`` of (lng, lat), nearest first ($geoNear)."""
    return await query_reachable(lng, lat, max_km, limit)


if __name__ == "__main__":
    mcp.run()
