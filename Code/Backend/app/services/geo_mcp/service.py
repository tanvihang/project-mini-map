"""Geo query core + RPC surface.

The core query lives here (no FastMCP import) so the gateway path stays light;
``server.py`` re-exposes the same function as an MCP tool for ADK agents.
"""

from __future__ import annotations

import logging

from app.core.config import get_db
from app.core.rpc import RpcRegistry
from app.models.schemas import GeoReachableRequest

logger = logging.getLogger("minimap.geo")


async def query_reachable(
    lng: float, lat: float, max_km: float, limit: int
) -> list[dict]:
    """Return POIs within ``max_km`` of (lng, lat), nearest first.

    Tolerant by design: if the DB/2dsphere index is missing it logs and
    returns an empty set so the skeleton runs without live data.
    """
    db = get_db()
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "distance_m",
                "maxDistance": max_km * 1000.0,
                "spherical": True,
            }
        },
        {"$limit": limit},
    ]
    try:
        cursor = await db.locations.aggregate(pipeline)
        docs = [doc async for doc in cursor]
    except Exception as exc:  # noqa: BLE001 - tolerant when no DB/index
        logger.warning("geo query failed (%s); returning empty set.", exc)
        return []

    for doc in docs:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
    return docs


async def reachable(payload: dict) -> dict:
    """RPC handler for ``geo.reachable``."""
    req = GeoReachableRequest(**payload)
    docs = await query_reachable(req.lng, req.lat, req.max_km, req.limit)
    return {"count": len(docs), "locations": docs}


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("geo.reachable", reachable)
