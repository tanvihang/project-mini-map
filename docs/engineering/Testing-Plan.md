# Project Mini Map — System Testing Plan v1.0

This multi-layer automated test plan verifies that geographic constraints hold (no geo-hallucination), money math is exact to the minor unit, and the agent's output is 100% schema-compliant. It tests the contracts defined in [`Data-Models.md`](Data-Models.md), [`MCP-Tools.md`](MCP-Tools.md), and [`Backend-Coding-Standards.md`](Backend-Coding-Standards.md).

> **Stack:** `pytest` + `pytest-asyncio` (Motor is async), run via `uv`.
>
> **Test execution environments.**
> - **Pure unit** (money helpers, split logic, schema stripping): no DB.
> - **`$geoNear` / `2dsphere`:** need a **real `mongod`** — use `testcontainers[mongodb]` (spins up a Mongo container) or a local/CI `mongod`. Note `mongomock` does **not** implement `$geoNear`, so it is unsuitable here.
> - **Atlas Vector Search (`$vectorSearch`) and Atlas Search (`$search`):** Atlas-only — run against a **live Atlas test cluster** (a disposable M0 or Atlas-local). Keep this suite separate and opt-in so the default unit run stays offline.

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

### 1.2 pytest Draft (Python / Motor)
Runs against a real `mongod` (testcontainers or local); `$geoNear` is supported off-Atlas.
```python
import os
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

@pytest.fixture(scope="module")
async def db():
    client = AsyncIOMotorClient(os.environ["MONGODB_TEST_URI"])
    database = client[os.environ["MONGODB_TEST_DB"]]
    await database.locations.create_index([("geoPoint", "2dsphere")])
    # ...seed Patan (~5km) and Pokhara (~200km) fixtures
    yield database
    client.close()

@pytest.mark.asyncio
async def test_excludes_pokhara_includes_patan_within_50km(db):
    kathmandu = [85.3240, 27.7172]  # [lon, lat]
    pipeline = [
        {"$geoNear": {
            "near": {"type": "Point", "coordinates": kathmandu},
            "distanceField": "dist.meters",
            "maxDistance": 50_000,
            "spherical": True,
        }}
    ]
    results = await db.locations.aggregate(pipeline).to_list(length=None)
    names = [r["name"] for r in results]

    assert not any("Pokhara" in n for n in names)  # must be excluded
    assert any("Patan" in n for n in names)         # must be included
```

---

## 2. Vector Search & Deduplication Testing  *(Atlas-only)*

Purpose: verify Voyage AI 1024-dim matching precision on **both** vector surfaces, plus the tag-based dedup path. Runs against a **live Atlas test cluster**.

### 2.1 Choice Vibe Ranking — `locations.embedding`
The user's interests are embedded at query time into a **query vector** (there is no stored `aestheticVector` field; interests live in `journeys.interests`). `$vectorSearch` ranks the geo-reachable candidates by vibe.
- **Method:** seed ~50 stylistically varied POIs (neon-lit districts, quiet zen retreats, etc.) with Voyage AI embeddings. Embed the interest query "cinematic, cyberpunk, night markets" as the query vector and run `$vectorSearch` on `locations.embedding`.
- **Assertions:**
  - >= 80% of the Top-5 results carry tags like `urban`, `night-market`, or `neon`.
  - Traditional `retreat` / `meditation` POIs score a cosine similarity below `0.4`.

### 2.2 Journal Semantic Search — `nodes.embedding`
- **Method:** after several days are written, embed a free-text query ("that quiet misty temple morning") and `$vectorSearch` over `nodes.embedding`.
- **Assertion:** the matching day's node ranks in the Top-3, enabling cross-trip journal recall.

### 2.3 Visited-Tags Deduplication
- **Setup:**
  1. `journeys.visitedTags = ["temple", "buddhism"]`.
  2. `$geoNear` recalls "Boudhanath Stupa" tagged `["buddhism", "photography"]`.
  3. The dedup filter runs (`tags $nin visitedTags`, applied in the geo `$match` and/or the `$vectorSearch` `filter`).
- **Assertion:** the candidates returned to Gemini **MUST** exclude any POI tagged `temple` or `buddhism`, preventing repeated same-type visits across the trip.

---

## 3. Financial-Grade Integer Money Testing

Purpose: prove that under multi-currency FX and accumulation, integer minor-unit arithmetic is exact. On the wire `minorUnits` is a string; in process it is a Python `int` (arbitrary precision) — never a float. Pure unit tests, no DB.

- **Case 1:** sum Day 1 expenses.
  - Item A: 5000 NPR (exponent 2, `minorUnits "500000"`).
  - Item B: 3000 NPR (exponent 2, `minorUnits "300000"`).
  - Locked rate: `fx_rate = 0.055`.
- **Assertions:**
  - Item A display: `round(500000 * 0.055) == 27500` (MYR 275.00).
  - Item B display: `round(300000 * 0.055) == 16500` (MYR 165.00).
  - Cumulative total is pure integer addition: `27500 + 16500 == 44000` (MYR 440.00) — never a float artefact like `440.000000004`.
- **Case 2 (split correctness):** `to_money_amount("44000", "MYR")` -> `major == 440, minor == "00"`; `to_money_amount("1000", "JPY")` (exponent 0) -> `major == 1000, minor == ""`.

```python
from app.lib.money import to_money_amount

def test_integer_money_accumulation():
    fx = 0.055
    a = round(500_000 * fx)   # 27500
    b = round(300_000 * fx)   # 16500
    assert (a, b) == (27_500, 16_500)
    assert a + b == 44_000    # exact integer addition (MYR 440.00)

def test_split_correctness():
    myr = to_money_amount("44000", "MYR")
    assert (myr.major, myr.minor) == (440, "00")
    jpy = to_money_amount("1000", "JPY")   # exponent 0
    assert (jpy.major, jpy.minor) == (1000, "")
```

---

## 4. Agent Output Schema Compliance (LLM Output)

Purpose: stress-test Gemini's streamed JSON for 100% contract compliance.

- **Method:** validate the assembled output with the Python **`jsonschema`** library against the published JSON Schemas (`DayNodeResponse`, `TripInitialization`) from [`System-Analysis.md`](../product/System-Analysis.md). *(`jsonschema` validates the documented draft-07 contracts; runtime boundary validation in production uses Pydantic — see [`Backend-Coding-Standards.md` §3](Backend-Coding-Standards.md).)*
- **Stress scenarios:**
  - A deliberately truncated stream.
  - Output wrapped in markdown fences (` ```json ... ``` `).
- **Assertions:**
  - The interceptor strips leading/trailing markdown fences so the recovered JSON passes `jsonschema.validate()`.
  - A truncated buffer, once the structure is optimistically closed, still yields a node containing a valid `title`, and never raises to the client.
  - Money fields validate as strings (e.g. `minorUnits` matches `^\d+$`), confirming no float leaked into the contract.

```python
import json
import jsonschema  # pip/uv: jsonschema

def test_daynode_passes_schema_after_fence_strip(day_node_schema, gemini_raw_with_fences):
    cleaned = strip_md_fences(gemini_raw_with_fences)   # remove ```json ... ```
    obj = json.loads(cleaned)
    jsonschema.validate(obj, day_node_schema)           # raises if non-compliant
    assert obj["choices"][0]["estimatedCost"]["minorUnits"].isdigit()  # string of digits
```

---

## 5. Coverage Summary

| Layer | Target | Environment |
| :--- | :--- | :--- |
| Geospatial reach | `$geoNear` radius bounds, 400km fallback | real `mongod` (testcontainers / local) |
| Choice vibe ranking | `$vectorSearch` on `locations.embedding` | live Atlas |
| Journal search | `$vectorSearch` on `nodes.embedding` | live Atlas |
| Dedup | `tags $nin visitedTags` | real `mongod` / live Atlas |
| Money | integer minor-unit math, FX rounding, split | pure unit (no DB) |
| Output contract | `jsonschema` conformance, stream resilience | pure unit (mock stream) |
