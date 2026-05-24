# Project Mini Map — MCP Tools Specification v1.0

This document defines the tool contracts that the MongoDB MCP (Model Context Protocol) server exposes to Google Cloud Agent Builder (the latest **Gemini Pro** available there). Parameter design, input/output shapes, and the underlying MongoDB pipelines follow the project's real MVP logic and the schemas in [`Data-Models.md`](Data-Models.md). All handlers obey [`Backend-Coding-Standards.md`](Backend-Coding-Standards.md) — integer minor units, `[lon, lat]` order, and the structured error contract.

---

## Tool Architecture Overview

Under MCP, each tool is declared to Gemini in JSON-RPC form with:
- `name` — unique tool name (`snake_case`).
- `description` — a precise description that tells Gemini when and how to use the tool.
- `inputSchema` — a JSON Schema for the input arguments.

Five tools are exposed: `get_journey_state`, `get_visited_tags`, `get_reachable_locations`, `create_node`, and `update_journey`.

### Response & Error Conventions
- Success: `{ "isSuccess": true, ... }`.
- Failure: handlers **MUST NOT** throw raw errors to the transport. They return the structured error contract (see [`Backend-Coding-Standards.md` §4](Backend-Coding-Standards.md)):
  ```json
  { "isSuccess": false, "errorCode": "ERR_NOT_FOUND", "errorMessage": "...", "fallbackAction": "ABORT" }
  ```
- Money is transmitted as **decimal strings** (`minorUnits`), never floats; the agent reasons over the integer string and the backend converts.

```typescript
import { ObjectId, Long } from 'mongodb';
import { errorContract } from '../lib/errors';   // builds the structured contract
import { exponentOf } from '../lib/money';        // ISO 4217 minor-unit digits
import { embedWithVoyage } from '../lib/voyage';  // 1024-dim query embedding
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

### 1.3 Backend Logic (Node.js)
```typescript
async function handleGetJourneyState(journeyIdStr: string) {
  if (!ObjectId.isValid(journeyIdStr)) {
    return errorContract('ERR_VALIDATION', 'journeyId is not a valid ObjectId.', 'RETRY_WITH_FIXED_SCHEMA');
  }
  const journey = await db.collection('journeys').findOne(
    { _id: new ObjectId(journeyIdStr) },
    { projection: { /* keep the lean state only */ } }
  );
  if (!journey) {
    return errorContract('ERR_NOT_FOUND', `Journey ${journeyIdStr} not found.`, 'ABORT');
  }
  return {
    isSuccess: true,
    journeyId: journey._id.toString(),
    destination: journey.destination,
    currentDay: journey.currentDay,
    totalDays: journey.totalDays,
    remainingDays: journey.totalDays - journey.currentDay,
    budgetCurrency: journey.budgetCurrency,
    budgetExponent: journey.budgetExponent,
    remainingBudgetMinor: journey.remainingBudgetMinor.toString(), // string — no precision loss
    currentLocation: journey.currentLocation,
    status: journey.status
  };
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

### 2.3 Backend Logic (Node.js)
```typescript
async function handleGetVisitedTags(journeyIdStr: string) {
  if (!ObjectId.isValid(journeyIdStr)) {
    return errorContract('ERR_VALIDATION', 'journeyId is not a valid ObjectId.', 'RETRY_WITH_FIXED_SCHEMA');
  }
  const journey = await db.collection('journeys').findOne(
    { _id: new ObjectId(journeyIdStr) },
    { projection: { visitedTags: 1 } }
  );
  if (!journey) {
    return errorContract('ERR_NOT_FOUND', `Journey ${journeyIdStr} not found.`, 'ABORT');
  }
  return { isSuccess: true, journeyId: journeyIdStr, visitedTags: journey.visitedTags ?? [] };
}
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

### 3.3 Backend Logic (Node.js & MongoDB)
```typescript
async function handleGetReachableLocations(input: {
  longitude: number; latitude: number; maxDistanceMeters?: number;
  excludeTags?: string[]; interestQuery?: string;
}) {
  const { longitude, latitude, maxDistanceMeters = 200000, excludeTags = [], interestQuery } = input;

  // STEP 1 — geographic reach. $geoNear MUST be stage 1 (its own pipeline).
  const geoCandidates = await db.collection('locations').aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] }, // [lon, lat]
        distanceField: 'dist.meters',
        maxDistance: maxDistanceMeters,
        spherical: true
      }
    },
    { $match: { tags: { $nin: excludeTags } } },          // tag-based dedup
    { $project: { placeId: 1, 'dist.meters': 1 } }
  ]).toArray();

  if (geoCandidates.length === 0) {
    // The caller (agent/middleware) should retry once at 400000 before giving up.
    return errorContract('ERR_GEOSPATIAL_EMPTY', 'No reachable POIs within the radius.', 'EXPAND_RADIUS');
  }

  const reachableIds = geoCandidates.map(c => c.placeId);
  const distById = new Map(geoCandidates.map(c => [c.placeId, c.dist.meters]));

  // STEP 2 — semantic vibe ranking. $vectorSearch MUST be stage 1 (separate pipeline),
  // constrained to the geo-reachable set via the vector index `filter`.
  let candidates;
  if (interestQuery) {
    const queryVector = await embedWithVoyage(interestQuery); // 1024-dim
    candidates = await db.collection('locations').aggregate([
      {
        $vectorSearch: {
          index: 'locations_vector_index',
          path: 'embedding',
          queryVector,
          filter: { placeId: { $in: reachableIds }, tags: { $nin: excludeTags } },
          numCandidates: 100,
          limit: 10
        }
      },
      { $project: { placeId: 1, name: 1, formattedAddress: 1, geoPoint: 1, costTier: 1, tags: 1, score: { $meta: 'vectorSearchScore' } } }
    ]).toArray();
  } else {
    // No vibe query: fall back to nearest reachable.
    candidates = await db.collection('locations')
      .find({ placeId: { $in: reachableIds } })
      .project({ embedding: 0 })
      .limit(10)
      .toArray();
  }

  return {
    isSuccess: true,
    candidates: candidates.map((loc: any) => ({
      placeId: loc.placeId,
      name: loc.name,
      formattedAddress: loc.formattedAddress,
      coordinates: loc.geoPoint.coordinates, // [lon, lat]
      costTier: loc.costTier,
      tags: loc.tags,
      distKms: Math.round((distById.get(loc.placeId) ?? 0) / 1000)
    }))
  };
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

### 4.3 Backend Logic (Node.js — with integer conversion)
```typescript
// Build a stored MoneyAmount (currency, exponent, minorUnits, major, minor) from integer minor units.
function toStoredMoney(minorUnits: bigint, currency: string) {
  const exponent = exponentOf(currency);              // never hardcode — ISO 4217 lookup
  const factor = 10n ** BigInt(exponent);
  return {
    currency,
    exponent,
    minorUnits: Long.fromString(minorUnits.toString()),
    major: Long.fromString((minorUnits / factor).toString()),
    minor: exponent === 0 ? '' : (minorUnits % factor).toString().padStart(exponent, '0')
  };
}

async function handleCreateNode(params: any) {
  const journey = await db.collection('journeys').findOne({ _id: new ObjectId(params.journeyId) });
  if (!journey) {
    return errorContract('ERR_NOT_FOUND', `Journey ${params.journeyId} not found.`, 'ABORT');
  }
  if (exponentOf(params.price.localCurrency) === undefined) {
    return errorContract('ERR_UNKNOWN_CURRENCY', `No exponent for ${params.price.localCurrency}.`, 'ASK_USER_CURRENCY');
  }

  // FX conversion happens once, at capture; round to integer display minor units.
  const localMinor = BigInt(params.price.localMinorUnits);
  const displayMinor = BigInt(Math.round(Number(localMinor) * params.price.fxRate));

  const document = {
    journeyId: new ObjectId(params.journeyId),
    seededByChoiceId: params.seededByChoiceId ? new ObjectId(params.seededByChoiceId) : null,
    placeId: params.placeId ?? null,
    dayNumber: params.dayNumber,
    orderInDay: params.orderInDay,
    time: params.time,
    title: params.title,
    location: {
      name: params.location.name,
      address: params.location.address ?? '',
      coordinates: { type: 'Point', coordinates: params.location.coordinates } // [lon, lat]
    },
    transport: params.transport ?? '',
    priceCategory: params.priceCategory,
    price: {
      display: toStoredMoney(displayMinor, journey.budgetCurrency), // exponent from journey.budgetCurrency
      local: toStoredMoney(localMinor, params.price.localCurrency),  // exponent from localCurrency (NOT hardcoded)
      fxRate: params.price.fxRate,
      asOf: new Date()
    },
    senses: params.senses,
    createdAt: new Date()
  };

  const result = await db.collection('nodes').insertOne(document);
  return { isSuccess: true, nodeId: result.insertedId.toString() };
}
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

### 5.3 Backend Logic (Node.js)
```typescript
async function handleUpdateJourney(params: any) {
  const deductAmount = BigInt(params.deductBudgetMinor);   // integer minor units

  // Atomic $set / $inc / $addToSet to avoid concurrent-update races.
  const updated = await db.collection('journeys').findOneAndUpdate(
    { _id: new ObjectId(params.journeyId) },
    {
      $set: {
        currentDay: params.currentDay,
        currentLocation: { type: 'Point', coordinates: params.newLocationCoordinates }, // [lon, lat]
        updatedAt: new Date()
      },
      $inc: { remainingBudgetMinor: Long.fromString((-deductAmount).toString()) }, // integer deduction
      $addToSet: { visitedTags: { $each: params.appendTags ?? [] } }
    },
    { returnDocument: 'after' }
  );

  if (!updated) {
    return errorContract('ERR_NOT_FOUND', `Journey ${params.journeyId} not found.`, 'ABORT');
  }
  return {
    isSuccess: true,
    currentDay: updated.currentDay,
    remainingBudgetMinor: updated.remainingBudgetMinor.toString() // string
  };
}
```
> Guard: if `remainingBudgetMinor` would go negative, the choice layer should already have blocked the option via the budget guard ([`Backend-Coding-Standards.md` §1.6](Backend-Coding-Standards.md)); a negative result here indicates an upstream bug and should surface `ERR_BUDGET_EXHAUSTED`.
