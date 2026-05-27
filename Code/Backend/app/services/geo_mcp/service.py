"""Geo candidate retrieval core + RPC surface (MCP-Tools.md §3).

Implements the geographic anti-hallucination gate: ``$geoNear`` is pipeline
stage 1 over ``locations`` ([lon, lat]), tag-dedup applied after, embedding
projected out, capped to a small Top-N. Returns the structured contract.

The semantic vibe re-ranking ($vectorSearch over Voyage embeddings) is the
documented step 2; it is left as a TODO here and the skeleton returns the
nearest-first reachable set.
"""

from __future__ import annotations

import logging

from app.core.config import get_db
from app.core.errors import (
    ERR_GEOSPATIAL_EMPTY,
    ERR_INTERNAL,
    error_contract,
    success,
)
from app.core.rpc import RpcRegistry
from app.models.schemas import GetReachableLocationsInput

logger = logging.getLogger("minimap.geo")

_TOP_N = 10


async def query_reachable(
    longitude: float,
    latitude: float,
    max_distance_meters: int,
    exclude_tags: list[str],
    interest_query: str | None = None,
) -> dict:
    """Return reachable POIs as the structured contract."""
    db = get_db()
    geo_pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "distanceField": "dist.meters",
                "maxDistance": max_distance_meters,
                "spherical": True,
            }
        },
        {"$match": {"tags": {"$nin": exclude_tags}}},
        {
            "$project": {
                "placeId": 1,
                "name": 1,
                "formattedAddress": 1,
                "geoPoint": 1,
                "costTier": 1,
                "tags": 1,
                "dist.meters": 1,
            }
        },
        {"$limit": _TOP_N},
    ]
    try:
        cursor = db.locations.aggregate(geo_pipeline)
        candidates = await cursor.to_list(length=_TOP_N)
    except (
        Exception
    ) as exc:  # noqa: BLE001 - degrade to a contract, never raise
        # Log the concise cause only; the full driver topology dump is noise.
        logger.warning("geo pipeline unavailable (%s)", type(exc).__name__)
        return error_contract(ERR_INTERNAL, "geo lookup failed")

    if not candidates:
        return error_contract(
            ERR_GEOSPATIAL_EMPTY, "No reachable POIs within the radius."
        )

    out = []
    for loc in candidates:
        dist_m = (loc.get("dist") or {}).get("meters", 0)
        out.append(
            {
                "placeId": loc.get("placeId"),
                "name": loc.get("name"),
                "formattedAddress": loc.get("formattedAddress"),
                "coordinates": (loc.get("geoPoint") or {}).get("coordinates"),
                "costTier": loc.get("costTier"),
                "tags": loc.get("tags", []),
                "distKms": round(dist_m / 1000),
            }
        )
    return success(candidates=out)


async def reachable(payload: dict) -> dict:
    """RPC handler for ``geo.reachable`` (== get_reachable_locations tool)."""
    req = GetReachableLocationsInput(**payload)
    return await query_reachable(
        req.longitude,
        req.latitude,
        req.max_distance_meters,
        req.exclude_tags,
        req.interest_query,
    )


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("geo.reachable", reachable)
