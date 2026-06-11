"""Journey state machine + RPC surface.

``_run_agent`` is the single tool-loop seam: today it returns a structured stub
day; the real implementation drives the ADK agent against the geo MCP tool and
the budget service. Tests monkeypatch ``_run_agent`` to assert the state machine
calls back into it without needing live Vertex AI.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from uuid import uuid4

from app.core.config import get_db, get_genai_client, get_settings
from app.core.errors import ERR_INTERNAL, ERR_NOT_FOUND, error_contract, success
from app.core.rpc import RpcRegistry
from app.core.rpc import rpc as _rpc
from app.models.schemas import (
    JourneyGetRequest,
    JourneyListRequest,
    JourneyNextDayRequest,
    JourneyStartRequest,
)

logger = logging.getLogger("minimap.journey")

_JOURNEYS: dict[str, dict] = {}


def _journeys_collection():
    return get_db().journeys


def _serialize_journey(doc: dict) -> dict:
    return {
        "journeyId": doc.get("journeyId"),
        "userId": doc.get("userId"),
        "destination": doc.get("destination"),
        "totalDays": doc.get("totalDays"),
        "currentDay": doc.get("currentDay"),
        "budgetCurrency": doc.get("budgetCurrency"),
        "totalBudgetMinor": doc.get("totalBudgetMinor"),
        "remainingBudgetMinor": doc.get("remainingBudgetMinor"),
        "travelStyle": doc.get("travelStyle"),
        "interests": doc.get("interests", []),
        "currentLocation": doc.get("currentLocation"),
        "startLocation": doc.get("startLocation"),
        "startLocationName": doc.get("startLocationName"),
        "visitedTags": doc.get("visitedTags", []),
        "waypoints": doc.get("waypoints", []),
        "status": doc.get("status"),
        "days": doc.get("days", []),
        "createdAt": (doc.get("createdAt") or datetime.utcnow()).isoformat(),
        "updatedAt": (doc.get("updatedAt") or datetime.utcnow()).isoformat(),
    }


async def _load_journey_state(journey_id: str) -> dict | None:
    try:
        doc = await _journeys_collection().find_one({"journeyId": journey_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey lookup failed: %s", exc)
        return None
    if not doc:
        return None
    return {
        "journeyId": doc.get("journeyId"),
        "userId": doc.get("userId"),
        "destination": doc.get("destination"),
        "totalDays": doc.get("totalDays"),
        "currentDay": doc.get("currentDay"),
        "budgetCurrency": doc.get("budgetCurrency"),
        "remainingBudgetMinor": doc.get("remainingBudgetMinor"),
        "currentLocation": doc.get("currentLocation"),
        "travelStyle": doc.get("travelStyle"),
        "interests": doc.get("interests", []),
        "visitedTags": doc.get("visitedTags", []),
        "lastChoices": doc.get("lastChoices", []),
    }


def _normalize_location(value: object) -> list[float] | None:
    if not isinstance(value, list) or len(value) != 2:
        return None
    try:
        lng = float(value[0])
        lat = float(value[1])
    except (TypeError, ValueError):
        return None
    if lng == 0.0 and lat == 0.0:
        return None
    return [lng, lat]


async def _suggest_waypoints(state: dict) -> list[dict]:
    """Suggest waypoints between days based on interests and route.

    This is a stub implementation that returns empty list.
    In production, this would query the geo service for POIs along the route.
    """
    # TODO: Implement actual waypoint suggestion using geo service
    # For now, return empty list - frontend can still add manual waypoints
    return []


async def _run_agent(state: dict) -> dict:
    """Produce one journal day from the current state (stub tool-loop).

    Demonstrates inter-service RPC: it asks the geo service for reachable POIs
    rather than importing geo_mcp directly. Geo returns the structured contract,
    so we read ``candidates`` only when ``isSuccess`` is true.
    """
    current_location = _normalize_location(state.get("currentLocation"))
    if current_location:
        lng, lat = current_location
        geo = await _rpc.call(
            "geo.reachable",
            {"longitude": lng, "latitude": lat, "maxDistanceMeters": 50_000},
        )
        if geo.get("isSuccess"):
            reachable = geo.get("candidates", [])
        else:
            logger.warning(
                "geo.reachable failed; continuing without POIs (%s)",
                geo.get("errorCode"),
            )
            reachable = []
    else:
        lng, lat = 0.0, 0.0
        reachable = []
    day_number = state.get("currentDay", 1)
    destination = state.get("destination", "destination")
    budget_currency = state.get("budgetCurrency", "MYR")
    total_days = state.get("totalDays", 1)
    remaining_budget_minor = int(state.get("remainingBudgetMinor", 0))
    remaining_days = max(1, total_days - day_number + 1)
    ceiling_minor = (
        remaining_budget_minor * 3 // (remaining_days * 2)
        if remaining_budget_minor > 0
        else 0
    )

    def _pick_candidates() -> list[dict]:
        if reachable:
            return reachable[:4]
        return [
            {
                "name": destination,
                "formattedAddress": None,
                "coordinates": [lng, lat],
                "tags": [],
                "distKms": 0,
                "costTier": 2,
            }
            for _ in range(4)
        ]

    candidate_set = _pick_candidates()
    base_types = ["move", "activity", "explore", "slow"]
    cost_factors = [0.9, 0.85, 0.8, 0.6]
    choices_base: list[dict] = []
    for idx, cand in enumerate(candidate_set):
        factor = cost_factors[idx % len(cost_factors)]
        estimate = max(1, int(ceiling_minor * factor)) if ceiling_minor else 0
        if estimate:
            budget = await _rpc.call(
                "budget.check",
                {
                    "remainingBudgetMinor": str(remaining_budget_minor),
                    "remainingDays": remaining_days,
                    "estimatedCostMinor": str(estimate),
                    "currency": budget_currency,
                },
            )
            if not budget.get("isSuccess") and ceiling_minor:
                estimate = ceiling_minor
        choices_base.append(
            {
                "type": base_types[idx % len(base_types)],
                "destinationName": cand.get("name") or destination,
                "destinationCoordinates": {
                    "type": "Point",
                    "coordinates": cand.get("coordinates") or [lng, lat],
                },
                "tags": cand.get("tags") or [],
                "estimatedCostMinor": str(estimate),
                "currency": budget_currency,
            }
        )

    primary = candidate_set[0]
    location_name = primary.get("name") or destination
    location_address = primary.get("formattedAddress")
    location_coordinates = primary.get("coordinates") or [lng, lat]

    client = get_genai_client()
    if client is None:
        return {
            "dayNumber": day_number,
            "title": f"Arrive in {destination}",
            "time": "Morning",
            "location": {
                "name": location_name,
                "address": location_address,
                "coordinates": location_coordinates,
            },
            "story": "",
            "senses": {},
            "dialogues": [],
            "culture": {"tips": []},
            "practical": {},
            "weather": {},
            "price": {
                "currency": budget_currency,
                "minor": str(max(0, min(ceiling_minor, remaining_budget_minor))),
            },
            "choices": choices_base,
            "stub": True,
        }

    prompt = {
        "task": "Generate a travel journal day in Chinese. Return JSON only.",
        "requirements": {
            "titleMaxWords": 8,
            "priceMinorMax": str(ceiling_minor),
            "useLocationName": location_name,
            "useLocationAddress": location_address,
            "choicesCount": len(choices_base),
        },
        "context": {
            "destination": destination,
            "dayNumber": day_number,
            "travelStyle": state.get("travelStyle"),
            "interests": state.get("interests", []),
            "budgetCurrency": budget_currency,
            "reachableCount": len(reachable),
        },
        "choicesBase": choices_base,
        "jsonSchema": {
            "title": "string",
            "time": "string",
            "story": "string",
            "senses": {
                "see": "string",
                "hear": "string",
                "smell": "string",
                "taste": "string",
                "touch": "string",
                "mood": "string",
            },
            "dialogues": [
                {
                    "speaker": "string",
                    "language": "string",
                    "text": "string",
                    "translation": "string",
                }
            ],
            "cultureTips": ["string"],
            "localPhrase": {
                "phrase": "string",
                "pronunciation": "string",
                "meaning": "string",
            },
            "practical": {
                "openingHours": "string",
                "crowdLevel": "string",
                "bestTimeToVisit": "string",
                "photoTip": "string",
            },
            "weather": {"condition": "string", "tempC": "number"},
            "priceMinor": "string",
            "choices": [
                {
                    "title": "string",
                    "description": "string",
                    "tags": ["string"],
                }
            ],
        },
    }

    def _generate_day() -> dict:
        response = client.models.generate_content(
            model=get_settings().gemini_model,
            contents=json.dumps(prompt, ensure_ascii=True),
            config={"response_mime_type": "application/json"},
        )
        text = getattr(response, "text", None) or str(response)
        cleaned = text.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
        return json.loads(cleaned)

    try:
        generated = await asyncio.to_thread(_generate_day)
    except Exception:  # noqa: BLE001 - fall back to stub output
        logger.exception("gemini generation failed; returning stub day")
        return {
            "dayNumber": day_number,
            "title": f"Arrive in {destination}",
            "time": "Morning",
            "location": {
                "name": location_name,
                "address": location_address,
                "coordinates": location_coordinates,
            },
            "story": "",
            "senses": {},
            "dialogues": [],
            "culture": {"tips": []},
            "practical": {},
            "weather": {},
            "price": {
                "currency": budget_currency,
                "minor": str(max(0, min(ceiling_minor, remaining_budget_minor))),
            },
            "choices": choices_base,
            "stub": True,
        }

    generated_choices = generated.get("choices") if isinstance(generated, dict) else None
    normalized_choices: list[dict] = []
    for idx, base in enumerate(choices_base):
        item = {}
        if isinstance(generated_choices, list) and idx < len(generated_choices):
            item = generated_choices[idx] or {}
        title = item.get("title") or f"{base['destinationName']}"
        description = item.get("description") or ""
        tags = item.get("tags") if isinstance(item.get("tags"), list) else base.get("tags")
        normalized_choices.append(
            {
                **base,
                "title": title,
                "description": description,
                "tags": tags,
            }
        )

    price_minor = generated.get("priceMinor") if isinstance(generated, dict) else None
    if not isinstance(price_minor, str) or not price_minor.isdigit():
        price_minor = str(max(0, min(ceiling_minor, remaining_budget_minor)))

    return {
        "dayNumber": day_number,
        "title": generated.get("title") if isinstance(generated, dict) else None
        or f"Arrive in {destination}",
        "time": generated.get("time") if isinstance(generated, dict) else None,
        "location": {
            "name": location_name,
            "address": location_address,
            "coordinates": location_coordinates,
        },
        "story": generated.get("story") if isinstance(generated, dict) else "",
        "senses": generated.get("senses") if isinstance(generated, dict) else {},
        "dialogues": generated.get("dialogues") if isinstance(generated, dict) else [],
        "culture": {
            "tips": generated.get("cultureTips")
            if isinstance(generated, dict)
            else [],
            "localPhrase": generated.get("localPhrase")
            if isinstance(generated, dict)
            else None,
        },
        "practical": generated.get("practical") if isinstance(generated, dict) else {},
        "weather": generated.get("weather") if isinstance(generated, dict) else {},
        "price": {"currency": budget_currency, "minor": price_minor},
        "choices": normalized_choices,
        "stub": False,
    }


async def start(payload: dict) -> dict:
    """Begin a journey and generate Day 1."""
    req = JourneyStartRequest(**payload)
    journey_id = str(uuid4())

    # Handle start location - can be coordinates or a name for geocoding
    start_location = None
    start_location_name = req.start_location_name

    if req.start_location:
        if isinstance(req.start_location, list):
            # Direct coordinates [lng, lat]
            start_location = _normalize_location(req.start_location)
        elif isinstance(req.start_location, dict) and req.start_location.get("name"):
            # Location name - would need geocoding service in production
            # For now, we'll store the name and use destination as fallback
            start_location_name = req.start_location["name"]
            logger.info("Start location name provided: %s", start_location_name)

    state = {
        "journeyId": journey_id,
        "userId": req.user_id,
        "destination": req.destination,
        "totalDays": req.total_days,
        "currentDay": 1,
        "budgetCurrency": req.budget_currency,
        "totalBudgetMinor": int(req.total_budget_minor),
        "remainingBudgetMinor": int(req.total_budget_minor),
        "currentLocation": start_location,
        "startLocation": start_location,
        "startLocationName": start_location_name,
        "travelStyle": req.travel_style,
        "interests": req.interests,
        "visitedTags": [],
        "waypoints": [],
    }
    day = await _run_agent(state)
    if not day.get("isSuccess", True):
        return day
    state["lastChoices"] = day.get("choices", [])
    _JOURNEYS[journey_id] = state

    # Generate suggested waypoints between days
    suggested_waypoints = await _suggest_waypoints(state)

    try:
        now = datetime.utcnow()
        await _journeys_collection().insert_one(
            {
                "journeyId": journey_id,
                "userId": req.user_id,
                "destination": req.destination,
                "totalDays": req.total_days,
                "currentDay": 1,
                "budgetCurrency": req.budget_currency,
                "totalBudgetMinor": int(req.total_budget_minor),
                "remainingBudgetMinor": int(req.total_budget_minor),
                "currentLocation": start_location,
                "startLocation": start_location,
                "startLocationName": start_location_name,
                "travelStyle": req.travel_style,
                "interests": req.interests,
                "visitedTags": [],
                "waypoints": suggested_waypoints,
                "lastChoices": day.get("choices", []),
                "days": [day],
                "status": "active",
                "createdAt": now,
                "updatedAt": now,
            }
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey insert failed: %s", exc)
    return success(journeyId=journey_id, state=state, day=day, suggestedWaypoints=suggested_waypoints)


async def next_day(payload: dict) -> dict:
    """Advance the journey using the traveller's chosen option index."""
    req = JourneyNextDayRequest(**payload)
    state = _JOURNEYS.get(req.journey_id)
    if not state:
        state = await _load_journey_state(req.journey_id)
    if not state:
        return error_contract(
            ERR_NOT_FOUND, "journey not found; restart JOURNEY_START"
        )

    choices = state.get("lastChoices") or []
    if choices and 0 <= req.chosen_index < len(choices):
        chosen = choices[req.chosen_index]
        coords = (
            chosen.get("destinationCoordinates") or {}
        ).get("coordinates")
        if isinstance(coords, list) and len(coords) == 2:
            state["currentLocation"] = coords
        cost_minor = chosen.get("estimatedCostMinor")
        if isinstance(cost_minor, str) and cost_minor.isdigit():
            state["remainingBudgetMinor"] = max(
                0, int(state.get("remainingBudgetMinor", 0)) - int(cost_minor)
            )
        tags = chosen.get("tags") if isinstance(chosen.get("tags"), list) else []
        if tags:
            state["visitedTags"] = list(
                dict.fromkeys(state.get("visitedTags", []) + tags)
            )

    state["currentDay"] = int(state.get("currentDay", 1)) + 1
    day = await _run_agent(state)
    if not day.get("isSuccess", True):
        return day
    state["lastChoices"] = day.get("choices", [])

    try:
        await _journeys_collection().update_one(
            {"journeyId": req.journey_id},
            {
                "$set": {
                    "currentDay": state.get("currentDay"),
                    "remainingBudgetMinor": state.get("remainingBudgetMinor"),
                    "currentLocation": state.get("currentLocation"),
                    "visitedTags": state.get("visitedTags", []),
                    "lastChoices": state.get("lastChoices", []),
                    "updatedAt": datetime.utcnow(),
                },
                "$push": {"days": day},
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey update failed: %s", exc)
    return success(
        journeyId=req.journey_id, chosenIndex=req.chosen_index, day=day
    )


async def list_journeys(payload: dict) -> dict:
    """List journeys for a user."""
    req = JourneyListRequest(**payload)
    try:
        cursor = (
            _journeys_collection()
            .find({"userId": req.user_id})
            .sort("createdAt", -1)
        )
        docs = await cursor.to_list(length=100)
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey list failed: %s", exc)
        return error_contract(ERR_INTERNAL, "journey lookup failed")

    journeys = [
        {
            "journeyId": doc.get("journeyId"),
            "destination": doc.get("destination"),
            "totalDays": doc.get("totalDays"),
            "budgetCurrency": doc.get("budgetCurrency"),
            "totalBudgetMinor": doc.get("totalBudgetMinor"),
            "createdAt": (doc.get("createdAt") or datetime.utcnow()).isoformat(),
            "updatedAt": (doc.get("updatedAt") or datetime.utcnow()).isoformat(),
            "currentDay": doc.get("currentDay"),
            "status": doc.get("status"),
        }
        for doc in docs
    ]
    return success(journeys=journeys)


async def get_journey(payload: dict) -> dict:
    """Return a single journey with its days."""
    req = JourneyGetRequest(**payload)
    try:
        doc = await _journeys_collection().find_one({"journeyId": req.journey_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning("journey get failed: %s", exc)
        return error_contract(ERR_INTERNAL, "journey lookup failed")
    if not doc:
        return error_contract(ERR_NOT_FOUND, "journey not found")
    return success(journey=_serialize_journey(doc))


def register(rpc: RpcRegistry) -> None:
    """Register this service's RPC methods."""
    rpc.register("journey.start", start)
    rpc.register("journey.next_day", next_day)
    rpc.register("journey.list", list_journeys)
    rpc.register("journey.get", get_journey)
