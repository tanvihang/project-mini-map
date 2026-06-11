"""Standalone FastMCP server exposing the geo tool over MCP (stdio).

Run so an ADK agent can connect via MCPToolset:

    python -m app.services.geo_mcp.server

The agent calls the typed, guarded tool and can never issue a raw query that
bypasses the geographic reachability constraint.
"""

from __future__ import annotations

from fastmcp import FastMCP

from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.services.geo_mcp.service import query_reachable

mcp = FastMCP("minimap-geo")


@mcp.tool
async def get_reachable_locations(
    longitude: float,
    latitude: float,
    max_distance_meters: int = 200_000,
    exclude_tags: list[str] | None = None,
    interest_query: str | None = None,
) -> dict:
    """Return locations reachable from (longitude, latitude), geo-filtered.

    Geographic and dedup filtering are enforced in the database; never invent
    coordinates. Returns the structured {isSuccess, ...} contract.
    """
    return await query_reachable(
        longitude,
        latitude,
        max_distance_meters,
        exclude_tags or [],
        interest_query,
    )


if __name__ == "__main__":
    configure_logging(get_settings().log_level)  # same format + trace-id field
    mcp.run()
