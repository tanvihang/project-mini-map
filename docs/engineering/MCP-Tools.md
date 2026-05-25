# Project Mini Map — MCP Tools Specification v1.0

This document defines the tool contracts that the MongoDB MCP (Model Context Protocol) server exposes to Google Cloud Agent Builder (the latest **Gemini Pro** available there). The MCP server is a **Python** service (official `mcp` SDK + **Motor** async driver); parameter design, input/output shapes, and the underlying MongoDB pipelines follow the project's real MVP logic and the schemas in [`Data-Models.md`](Data-Models.md). All handlers obey [`Backend-Coding-Standards.md`](Backend-Coding-Standards.md) — integer minor units, `[lon, lat]` order, and the structured error contract.

---

## Tool Architecture Overview

Under MCP, each tool is declared to Gemini with:
- `name` — unique tool name (`snake_case`).
- `description` — a precise description that tells Gemini when and how to use the tool.
- `inputSchema` — a JSON Schema for the input arguments.

Five tools are exposed: `get_journey_state`, `get_visited_tags`, `get_reachable_locations`, `create_node`, and `update_journey`. The JSON definitions below are language-agnostic; the handlers are async Python registered with the `mcp` SDK.

### Response & Error Conventions
- Success: `{"isSuccess": true, ...}`.
- Failure: handlers **MUST NOT** raise to the transport. They return the structured error contract (see [`Backend-Coding-Standards.md` §4](Backend-Coding-Standards.md)):
  ```json
  { "isSuccess": false, "errorCode": "ERR_NOT_FOUND", "errorMessage": "...", "fallbackAction": "ABORT" }
  ```
- Money is transmitted as **decimal strings** (`minorUnits`), never floats; the agent reasons over the integer string and the backend converts.

```python
from bson import ObjectId, Int64
from pymongo import ReturnDocument

from app.lib.db import db                 # Motor AsyncIOMotorDatabase
from app.lib.errors import error_contract  # builds the structured contract
from app.lib.money import exponent_of      # ISO 4217 minor-unit digits
from app.lib.voyage import embed_with_voyage  # async 1024-dim query embedding

def to_stored_money(minor_units: int, currency: str) -> dict:
    """Build the stored MoneyAmount sub-document; minorUnits/major as BSON Int64 (== NumberLong)."""
    exponent = exponent_of(currency)        # never hardcode — ISO 4217 lookup
    factor = 10 ** exponent
    return {
        "currency": currency,
        "exponent": exponent,
        "minorUnits": Int64(minor_units),
        "major": Int64(minor_units // factor),
        "minor": "" if exponent == 0 else str(minor_units % factor).zfill(exponent),
    }
```

---

## 1. `get_journey_state` — Read the Journey State-Machine Metadata

### 1.1 Description
When a session starts or the user advances to a new day, Gemini calls this first to load the core journey context (remaining budget, remaining days, current location, currency).

### 1.2 MCP Definition & Input Schema
```json
{
  "name": "get_journey_state",
  "description": "Retrieve the current state of a journey: remaining budget, remaining days, current location coordinates, currency, and status.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "journeyId": { "type": "string", "description": "The BSON ObjectId string of the active journey." }
    },
    "required": ["journeyId"]
  }
}
```

### 1.3 Backend Logic (Python / Motor)
```python
async def handle_get_journey_state(journey_id: str) -> dict:
    if not ObjectId.is_valid(journey_id):
        return error_contract("ERR_VALIDATION", "journeyId is not a valid ObjectId.", "RETRY_WITH_FIXED_SCHEMA")
    journey = await db.journeys.find_one(
        {"_id": ObjectId(journey_id)},
        projection={"embedding": 0},  # keep the lean state only
    )
    if journey is None:
        return error_contract("ERR_NOT_FOUND", f"Journey {journey_id} not found.", "ABORT")
    return {
        "isSuccess": True,
        "journeyId": str(journey["_id"]),
        "destination": journey["destination"],
        "currentDay": journey["currentDay"],
        "totalDays": journey["totalDays"],
        "remainingDays": journey["totalDays"] - journey["currentDay"],
        "budgetCurrency": journey["budgetCurrency"],
        "budgetExponent": journey["budgetExponent"],
        "remainingBudgetMinor": str(journey["remainingBudgetMinor"]),  # string — no precision loss for JS clients
        "currentLocation": journey["currentLocation"],
        "status": journey["status"],
    }
```

---

## 2. `get_visited_tags` — Read the Visited-Tag Cache (Dedup Dependency)

### 2.1 Description
Before generating the next set of options, Gemini calls this to read the experience tags the user has already accumulated, so recommendations can be de-duplicated (e.g., if temples are visited, lean toward nature or culture next).

### 2.2 MCP Definition & Input Schema
```json
{
  "name": "get_visited_tags",
  "description": "Fetch the full array of search tags already visited in this journey, used for recommendation deduplication.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "journeyId": { "type": "string", "description": "The BSON ObjectId of the journey." }
    },
    "required": ["journeyId"]
  }
}
```

### 2.3 Backend Logic (Python / Motor)
```python
async def handle_get_visited_tags(journey_id: str) -> dict:
    if not ObjectId.is_valid(journey_id):
        return error_contract("ERR_VALIDATION", "journeyId is not a valid ObjectId.", "RETRY_WITH_FIXED_SCHEMA")
    journey = await db.journeys.find_one(
        {"_id": ObjectId(journey_id)},
        projection={"visitedTags": 1},
    )
    if journey is None:
        return error_contract("ERR_NOT_FOUND", f"Journey {journey_id} not found.", "ABORT")
    return {"isSuccess": True, "journeyId": journey_id, "visitedTags": journey.get("visitedTags", [])}
```

---

## 3. `get_reachable_locations` — Geo + Semantic Candidate Retrieval

### 3.1 Description
The **core geographic anti-hallucination gate**. Gemini **MUST NOT** invent coordinates. It passes the current position and an optional vibe query; the tool returns a clean, physically reachable, vibe-ranked, de-duplicated list of candidate POIs.

This is a **two-step retrieval**, because in Atlas both `$geoNear` and `$vectorSearch` must be the **first** stage of their pipeline and therefore cannot share one pipeline (see [`Backend-Coding-Standards.md` §2](Backend-Coding-Standards.md)):
1. **Geo reach** — `$geoNear` on `locations` returns the reachable candidate `placeId`s within the radius (with tag dedup).
2. **Vibe ranking** — `$vectorSearch` on `locations.embedding`, `filter`-constrained to those `placeId`s and excluding visited tags, ranks them by similarity to the user's interest query vector.

### 3.2 MCP Definition & Input Schema
```json
{
  "name": "get_reachable_locations",
  "description": "Return locations reachable from the current coordinate, ranked by how well they match the traveller's interests. Geographic and dedup filtering are enforced in the database; never invent coordinates.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "longitude": { "type": "number", "description": "Current position longitude (GeoJSON X)." },
      "latitude":  { "type": "number", "description": "Current position latitude (GeoJSON Y)." },
      "maxDistanceMeters": { "type": "integer", "default": 200000, "description": "Max travel radius in meters (200km default; expand to 400000 if empty)." },
      "excludeTags": { "type": "array", "items": { "type": "string" }, "description": "Tags to filter out (from visitedTags)." },
      "interestQuery": { "type": "string", "description": "Free-text vibe to rank by, e.g. 'quiet mountain temples, street photography'. If omitted, results are ranked by proximity only." }
    },
    "required": ["longitude", "latitude"]
  }
}
```

### 3.3 Backend Logic (Python / Motor)
```python
async def handle_get_reachable_locations(
    longitude: float,
    latitude: float,
    max_distance_meters: int = 200_000,
    exclude_tags: list[str] | None = None,
    interest_query: str | None = None,
) -> dict:
    exclude_tags = exclude_tags or []

    # STEP 1 — geographic reach. $geoNear MUST be stage 1 (its own pipeline).
    geo_pipeline = [
        {"$geoNear": {
            "near": {"type": "Point", "coordinates": [longitude, latitude]},  # [lon, lat]
            "distanceField": "dist.meters",
            "maxDistance": max_distance_meters,
            "spherical": True,
        }},
        {"$match": {"tags": {"$nin": exclude_tags}}},   # tag-based dedup
        {"$project": {"placeId": 1, "dist.meters": 1}},
    ]
    geo_candidates = await db.locations.aggregate(geo_pipeline).to_list(length=None)

    if not geo_candidates:
        # The caller (agent/middleware) should retry once at 400000 before giving up.
        return error_contract("ERR_GEOSPATIAL_EMPTY", "No reachable POIs within the radius.", "EXPAND_RADIUS")

    reachable_ids = [c["placeId"] for c in geo_candidates]
    dist_by_id = {c["placeId"]: c["dist"]["meters"] for c in geo_candidates}

    # STEP 2 — semantic vibe ranking. $vectorSearch MUST be stage 1 (separate pipeline),
    # constrained to the geo-reachable set via the vector index `filter`.
    if interest_query:
        query_vector = await embed_with_voyage(interest_query)  # 1024-dim
        vector_pipeline = [
            {"$vectorSearch": {
                "index": "locations_vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "filter": {"placeId": {"$in": reachable_ids}, "tags": {"$nin": exclude_tags}},
                "numCandidates": 100,
                "limit": 10,
            }},
            {"$project": {
                "placeId": 1, "name": 1, "formattedAddress": 1, "geoPoint": 1,
                "costTier": 1, "tags": 1, "score": {"$meta": "vectorSearchScore"},
            }},
        ]
        candidates = await db.locations.aggregate(vector_pipeline).to_list(length=10)
    else:
        # No vibe query: fall back to nearest reachable.
        candidates = await db.locations.find(
            {"placeId": {"$in": reachable_ids}}, projection={"embedding": 0}
        ).to_list(length=10)

    return {
        "isSuccess": True,
        "candidates": [
            {
                "placeId": loc["placeId"],
                "name": loc["name"],
                "formattedAddress": loc.get("formattedAddress"),
                "coordinates": loc["geoPoint"]["coordinates"],  # [lon, lat]
                "costTier": loc["costTier"],
                "tags": loc["tags"],
                "distKms": round(dist_by_id.get(loc["placeId"], 0) / 1000),
            }
            for loc in candidates
        ],
    }
```

---

## 4. `create_node` — Write a Generated Journal Stop to Atlas

### 4.1 Description
After Gemini composes a day's experience (senses, dialogue, culture), it calls this to persist each stop to the `nodes` collection.

### 4.2 MCP Definition & Input Schema
The schema is deliberately strict, forcing Gemini to provide well-formed money, coordinates, and senses. **Money is supplied in local minor units as a string**; the backend converts to the display currency.
```json
{
  "name": "create_node",
  "description": "Write a newly generated daily stop (node) document to the nodes collection.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "journeyId": { "type": "string" },
      "dayNumber": { "type": "integer" },
      "orderInDay": { "type": "integer" },
      "time": { "type": "string" },
      "title": { "type": "string" },
      "seededByChoiceId": { "type": ["string", "null"] },
      "placeId": { "type": ["string", "null"] },
      "location": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "address": { "type": "string" },
          "coordinates": { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 }
        },
        "required": ["name", "coordinates"]
      },
      "transport": { "type": "string" },
      "priceCategory": { "type": "string", "enum": ["accommodation", "food", "transport", "entry", "other"] },
      "price": {
        "type": "object",
        "properties": {
          "localCurrency": { "type": "string", "description": "ISO 4217 of the destination, e.g. NPR." },
          "localMinorUnits": { "type": "string", "description": "Local price as an integer minor-unit STRING, e.g. \"80000\" for 800.00 NPR." },
          "fxRate": { "type": "number", "description": "local -> display ratio." }
        },
        "required": ["localCurrency", "localMinorUnits", "fxRate"]
      },
      "senses": {
        "type": "object",
        "properties": {
          "see": { "type": "string" }, "hear": { "type": "string" }, "smell": { "type": "string" },
          "taste": { "type": "string" }, "touch": { "type": "string" }, "mood": { "type": "string" }, "story": { "type": "string" }
        },
        "required": ["see", "hear", "smell", "story"]
      }
    },
    "required": ["journeyId", "dayNumber", "orderInDay", "title", "location", "priceCategory", "price", "senses"]
  }
}
```

### 4.3 Backend Logic (Python / Motor — with integer conversion)
```python
async def handle_create_node(params: dict) -> dict:
    journey = await db.journeys.find_one({"_id": ObjectId(params["journeyId"])})
    if journey is None:
        return error_contract("ERR_NOT_FOUND", f"Journey {params['journeyId']} not found.", "ABORT")

    local_currency = params["price"]["localCurrency"]
    try:
        local_money = to_stored_money(int(params["price"]["localMinorUnits"]), local_currency)
    except UnknownCurrencyError:
        return error_contract("ERR_UNKNOWN_CURRENCY", f"No exponent for {local_currency}.", "ASK_USER_CURRENCY")

    # FX conversion happens once, at capture; round to integer display minor units.
    display_minor = round(int(params["price"]["localMinorUnits"]) * params["price"]["fxRate"])

    document = {
        "journeyId": ObjectId(params["journeyId"]),
        "seededByChoiceId": ObjectId(params["seededByChoiceId"]) if params.get("seededByChoiceId") else None,
        "placeId": params.get("placeId"),
        "dayNumber": params["dayNumber"],
        "orderInDay": params["orderInDay"],
        "time": params.get("time"),
        "title": params["title"],
        "location": {
            "name": params["location"]["name"],
            "address": params["location"].get("address", ""),
            "coordinates": {"type": "Point", "coordinates": params["location"]["coordinates"]},  # [lon, lat]
        },
        "transport": params.get("transport", ""),
        "priceCategory": params["priceCategory"],
        "price": {
            "display": to_stored_money(display_minor, journey["budgetCurrency"]),  # exponent from budgetCurrency
            "local": local_money,                                                  # exponent from localCurrency (not hardcoded)
            "fxRate": params["price"]["fxRate"],
            "asOf": datetime.now(tz=timezone.utc),
        },
        "senses": params["senses"],
        "createdAt": datetime.now(tz=timezone.utc),
    }

    result = await db.nodes.insert_one(document)
    return {"isSuccess": True, "nodeId": str(result.inserted_id)}
```
> Note: `embedding` is generated by a separate backend step (Voyage AI over `senses.story + searchTags`) and is not part of the agent's `create_node` payload, to keep the agent's token cost low.

---

## 5. `update_journey` — Atomically Advance the Journey State Machine

### 5.1 Description
Once a day is written and the user commits the next choice, Gemini calls this to atomically update the current day, deduct the remaining budget (integer minor units), move the current location, and append visited tags.

### 5.2 MCP Definition & Input Schema
```json
{
  "name": "update_journey",
  "description": "Atomically advance the day, deduct remaining budget (minor units), move the current location, and append visited tags.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "journeyId": { "type": "string" },
      "currentDay": { "type": "integer" },
      "deductBudgetMinor": { "type": "string", "description": "Integer minor units to deduct, as a string." },
      "newLocationCoordinates": { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 },
      "appendTags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["journeyId", "currentDay", "deductBudgetMinor", "newLocationCoordinates"]
  }
}
```

### 5.3 Backend Logic (Python / Motor)
```python
async def handle_update_journey(params: dict) -> dict:
    deduct = int(params["deductBudgetMinor"])   # integer minor units

    # Atomic $set / $inc / $addToSet to avoid concurrent-update races.
    updated = await db.journeys.find_one_and_update(
        {"_id": ObjectId(params["journeyId"])},
        {
            "$set": {
                "currentDay": params["currentDay"],
                "currentLocation": {"type": "Point", "coordinates": params["newLocationCoordinates"]},  # [lon, lat]
                "updatedAt": datetime.now(tz=timezone.utc),
            },
            "$inc": {"remainingBudgetMinor": Int64(-deduct)},          # integer deduction (Int64 == NumberLong)
            "$addToSet": {"visitedTags": {"$each": params.get("appendTags", [])}},
        },
        return_document=ReturnDocument.AFTER,
    )

    if updated is None:
        return error_contract("ERR_NOT_FOUND", f"Journey {params['journeyId']} not found.", "ABORT")
    return {
        "isSuccess": True,
        "currentDay": updated["currentDay"],
        "remainingBudgetMinor": str(updated["remainingBudgetMinor"]),  # string
    }
```
> Guard: if `remainingBudgetMinor` would go negative, the choice layer should already have blocked the option via the budget guard ([`Backend-Coding-Standards.md` §1.6](Backend-Coding-Standards.md)); a negative result here indicates an upstream bug and should surface `ERR_BUDGET_EXHAUSTED`.
