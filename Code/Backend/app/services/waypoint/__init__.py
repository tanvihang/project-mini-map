"""Waypoint service package."""

from app.services.waypoint.service import register
from app.services.waypoint.service import (
    add_waypoint,
    remove_waypoint,
    suggest_waypoints,
)

__all__ = ["register", "add_waypoint", "remove_waypoint", "suggest_waypoints"]