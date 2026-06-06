"""Waypoint service for managing stops between journey days.

Provides RPC handlers for adding, removing, and suggesting waypoints.
"""

from __future__ import annotations

import logging
from datetime import datetime

from app.core.config import get_db
from app.core.errors import ERR_INTERNAL, ERR_NOT_FOUND, error_contract, success
from app.core.rpc import RpcRegistry
from app.models.schemas import (
    WaypointAddRequest,
    WaypointRemoveRequest,
    WaypointSuggestRequest,
)

logger = logging.getLogger("minimap.waypoint")


def _journeys_collection():
    return get_db().journeys


async def add_waypoint(payload: dict) -> dict:
    """Add a manual waypoint to a journey."""
    req = WaypointAddRequest(**payload)

    try:
        journey = await _journeys_collection().find_one({"journeyId": req.journey_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey lookup failed: %s", exc)
        return error_contract(ERR_INTERNAL, "journey lookup failed")

    if not journey:
        return error_contract(ERR_NOT_FOUND, "journey not found")

    new_waypoint = {
        "name": req.name,
        "coordinates": {
            "type": "Point",
            "coordinates": req.coordinates,
        },
        "type": "manual",
        "betweenDays": list(req.between_days) if req.between_days else None,
    }

    try:
        await _journeys_collection().update_one(
            {"journeyId": req.journey_id},
            {
                "$push": {"waypoints": new_waypoint},
                "$set": {"updatedAt": datetime.utcnow()},
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("waypoint add failed: %s", exc)
        return error_contract(ERR_INTERNAL, "failed to add waypoint")

    return success(waypoint=new_waypoint)


async def remove_waypoint(payload: dict) -> dict:
    """Remove a waypoint from a journey by index."""
    req = WaypointRemoveRequest(**payload)

    try:
        journey = await _journeys_collection().find_one({"journeyId": req.journey_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey lookup failed: %s", exc)
        return error_contract(ERR_INTERNAL, "journey lookup failed")

    if not journey:
        return error_contract(ERR_NOT_FOUND, "journey not found")

    waypoints = journey.get("waypoints", [])
    if req.waypoint_index < 0 or req.waypoint_index >= len(waypoints):
        return error_contract(ERR_NOT_FOUND, "waypoint index out of range")

    removed = waypoints.pop(req.waypoint_index)

    try:
        await _journeys_collection().update_one(
            {"journeyId": req.journey_id},
            {
                "$set": {
                    "waypoints": waypoints,
                    "updatedAt": datetime.utcnow(),
                }
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("waypoint remove failed: %s", exc)
        return error_contract(ERR_INTERNAL, "failed to remove waypoint")

    return success(removedWaypoint=removed)


async def suggest_waypoints(payload: dict) -> dict:
    """Suggest waypoints between two days based on route and interests.

    This is a stub that returns empty suggestions.
    In production, this would query the geo service for POIs along the route.
    """
    req = WaypointSuggestRequest(**payload)

    try:
        journey = await _journeys_collection().find_one({"journeyId": req.journey_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey lookup failed: %s", exc)
        return error_contract(ERR_INTERNAL, "journey lookup failed")

    if not journey:
        return error_contract(ERR_NOT_FOUND, "journey not found")

    # TODO: Implement actual suggestion logic using geo service
    # For now, return empty list
    suggestions = []

    return success(suggestions=suggestions)


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("waypoint.add", add_waypoint)
    rpc.register("waypoint.remove", remove_waypoint)
    rpc.register("waypoint.suggest", suggest_waypoints)