# Project Mini Map — System Testing Plan v1.0

This multi-layer automated test plan verifies that geographic constraints hold (no geo-hallucination), money math is exact to the minor unit, and the agent's output is 100% schema-compliant. It tests the contracts defined in [`Data-Models.md`](Data-Models.md), [`MCP-Tools.md`](MCP-Tools.md), and [`Backend-Coding-Standards.md`](Backend-Coding-Standards.md).

> **Test execution environments.** `2dsphere` / `$geoNear` and integer money math run on **`mongodb-memory-server`** (fast, in-CI). **Atlas Vector Search (`$vectorSearch`) and Atlas Search (`$search`) are Atlas-only** and cannot run on the memory server — those suites MUST run against a **live Atlas test cluster** (a disposable M0 or an Atlas-local instance). Keep the two suites separate so unit tests stay offline.

---

## 1. Deterministic Geospatial Anti-Hallucination Testing

Purpose: prove that the `2dsphere` index and `$geoNear` aggregation actually block destinations outside the physical radius.

### 1.1 Edge Boundary Cases
- **Case 1:** current coordinate at central Kathmandu `[85.3240, 27.7172]`, `maxDistance = 50000` m (50km). *(50km is used here to force the boundary; the production default is 200km.)*
  - **Assertions:**
    - "Patan Durbar Square" (~5km, inside the Kathmandu valley) **MUST** appear in the candidate list.
    - "Pokhara" / Phewa Lake (~200km away) **MUST NOT** appear.
- **Case 2:** remote-destination fallback — `maxDistance = 200000` m returns an empty list.
  - **Assertion:** the tool returns `ERR_GEOSPATIAL_EMPTY`, and the caller retries once at `400000` m and succeeds.

### 1.2 Jest Test Draft (TypeScript)
Runs on `mongodb-memory-server` or a test DB; `$geoNear` is supported off-Atlas.
```typescript
import { MongoClient } from 'mongodb';

describe('Geospatial Radius Anti-Hallucination', () => {
  let connection: MongoClient;
  let db: any;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.MONGODB_TEST_URI!);
    db = connection.db(process.env.MONGODB_TEST_DB!);
    await db.collection('locations').createIndex({ geoPoint: '2dsphere' });
    // ...seed Patan (~5km) and Pokhara (~200km) fixtures
  });

  afterAll(async () => { await connection.close(); });

  it('excludes Pokhara and includes Patan within a 50km radius of Kathmandu', async () => {
    const kathmandu = [85.3240, 27.7172]; // [lon, lat]
    const results = await db.collection('locations').aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: kathmandu },
          distanceField: 'dist.meters',
          maxDistance: 50000,
          spherical: true
        }
      }
    ]).toArray();

    expect(results.some((l: any) => l.name.includes('Pokhara'))).toBe(false); // must be excluded
    expect(results.some((l: any) => l.name.includes('Patan'))).toBe(true);    // must be included
  });
});
```

---

## 2. Vector Search & Deduplication Testing  *(Atlas-only)*

Purpose: verify Voyage AI 1024-dim matching precision on **both** vector surfaces, plus the tag-based dedup path. Runs against a **live Atlas test cluster**.

### 2.1 Choice Vibe Ranking — `locations.embedding`
The user's interests are embedded at query time into a **query vector** (there is no stored `aestheticVector` field; interests live in `journeys.interests`). `$vectorSearch` ranks the geo-reachable candidates by vibe.
- **Method:** seed ~50 stylistically varied POIs (neon-lit districts, quiet zen retreats, etc.) with Voyage AI embeddings. Embed the interest query "cinematic, cyberpunk, night markets" as the query vector and run `$vectorSearch` on `locations.embedding`.
- **Assertions:**
  - ≥ 80% of the Top-5 results carry tags like `urban`, `night-market`, or `neon`.
  - Traditional `retreat` / `meditation` POIs score a cosine similarity below `0.4`.

### 2.2 Journal Semantic Search — `nodes.embedding`
- **Method:** after several days are written, embed a free-text query ("that quiet misty temple morning") and `$vectorSearch` over `nodes.embedding`.
- **Assertion:** the matching day's node ranks in the Top-3, enabling cross-trip journal recall.

### 2.3 Visited-Tags Deduplication
- **Setup:**
  1. `journeys.visitedTags = ["temple", "buddhism"]`.
  2. `$geoNear` recalls "Boudhanath Stupa" tagged `["buddhism", "photography"]`.
  3. The dedup filter runs (`tags $nin visitedTags`, applied in the geo `$match` and/or the `$vectorSearch` `filter`).
- **Assertion:** the `nearbyOptions` returned to Gemini **MUST** exclude any POI tagged `temple` or `buddhism`, preventing repeated same-type visits across the trip.

---

## 3. Financial-Grade Integer Money Testing

Purpose: prove that under multi-currency FX and accumulation, Long minor-unit arithmetic is exact. On the wire `minorUnits` is a string; in process it is `BigInt` / `Long` — never a float.

- **Case 1:** sum Day 1 expenses.
  - Item A: 5000 NPR (exponent 2, `minorUnits "500000"`).
  - Item B: 3000 NPR (exponent 2, `minorUnits "300000"`).
  - Locked rate: `fxRate = 0.055`.
- **Assertions:**
  - Item A display: `round(500000 * 0.055) = 27500` (MYR 275.00).
  - Item B display: `round(300000 * 0.055) = 16500` (MYR 165.00).
  - Cumulative total is pure integer addition: `27500n + 16500n = 44000n` (MYR 440.00).
  - The stored and re-read values **MUST** remain exact `Long` integers — never a float artefact like `440.000000004`.
- **Case 2 (split correctness):** `toMoneyAmount("44000", "MYR")` yields `{ major: "440", minor: "00" }`; `toMoneyAmount("1000", "JPY")` (exponent 0) yields `{ major: "1000", minor: "" }`.

---

## 4. Agent Output Schema Compliance (LLM Output)

Purpose: stress-test Gemini's streamed JSON for 100% contract compliance.

- **Method:** validate streamed output with **`ajv`** against the published JSON Schemas (`DayNodeResponse`, `TripInitialization`) from [`System-Analysis.md`](../product/System-Analysis.md). *(`ajv` is for contract/conformance testing; runtime boundary validation in production uses Zod — see [`Backend-Coding-Standards.md` §3](Backend-Coding-Standards.md).)*
- **Stress scenarios:**
  - A deliberately truncated Gemini stream.
  - Output wrapped in markdown fences (` ```json ... ``` `).
- **Assertions:**
  - The interceptor strips leading/trailing markdown fences so the recovered JSON passes `ajv.validate()`.
  - Truncated JSON parsed by `partial-json-parser` recovers a node containing a valid `title`, and never throws a runtime exception to the client.
  - Money fields validate as strings (e.g. `minorUnits` matches `^\d+$`), confirming no float leaked into the contract.

---

## 5. Coverage Summary

| Layer | Target | Environment |
| :--- | :--- | :--- |
| Geospatial reach | `$geoNear` radius bounds, 400km fallback | memory-server / test DB |
| Choice vibe ranking | `$vectorSearch` on `locations.embedding` | live Atlas |
| Journal search | `$vectorSearch` on `nodes.embedding` | live Atlas |
| Dedup | `tags $nin visitedTags` | memory-server / live Atlas |
| Money | integer minor-unit math, FX rounding, split | pure unit (no DB) |
| Output contract | `ajv` schema conformance, stream resilience | pure unit (mock stream) |
