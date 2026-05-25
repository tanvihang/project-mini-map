# Project Mini Map — Backend Coding Standards v1.0

This document defines the coding standards for the Project Mini Map backend: a **Python** service built with **FastAPI** (async), **Motor** (async MongoDB driver), and **Pydantic** for validation. **Every human developer and every collaborating AI agent must follow it strictly** to guarantee financial-grade money accuracy, correct geospatial computation, and resilient LLM / MCP integration. (The frontend is a separate Next.js app and is out of scope here.)

It is the companion of:
- [`Data-Models.md`](Data-Models.md) — the authoritative MongoDB schemas (`MoneyAmount` / `Money`, collections, indexes).
- [`MCP-Tools.md`](MCP-Tools.md) — the MCP tool contracts the agent calls.

> **Conventions in this doc:** "MUST" / "MUST NOT" are hard rules (CI / review should reject violations). "SHOULD" is a strong default you may deviate from with a written reason. Items marked **Team to confirm** are concrete choices that need a one-time team decision; sensible defaults are given.
>
> **Stack:** FastAPI · Motor · Pydantic v2 · official `mcp` Python SDK · uv (packaging) · pytest · ruff + black + mypy. Target **Python 3.12**.

---

## 1. Money Handling Law (Financial-Grade)

Floating point (Python `float`, like JS `Number`, is IEEE-754) cannot represent values like `0.10` exactly, so decimal money math accumulates error. To eliminate it entirely:

### 1.1 Storage & Computation
- **MUST NOT** use `float` or `Decimal` for money anywhere (no `total_spent = 44.20`).
- **MUST** store every amount as an **integer count of the currency's minor unit**:
  - MYR 44.00 -> `4400` (44 x 10**2).
  - JPY 1000 -> `1000` (JPY has no minor unit, exponent 0, so 1000 x 10**0).
- **Authoritative math:** all budget deductions, category rollups, and comparisons **MUST** use **integer** arithmetic on `minor_units`. Python's `int` is **arbitrary precision**, so no special big-integer type is needed — just never let a `float` touch a money value.

### 1.2 Two Representations: Domain vs Wire
In Python `minor_units` is a plain `int`. But the **frontend is JavaScript**, where numbers above 2**53 are unsafe. Therefore, on **every wire boundary (MCP responses and the REST API), `minorUnits` and `major` MUST be serialized as decimal strings.** `exponent` stays a number (small, not money). In BSON they are stored as native `int` (int64); only the JSON representation is a string.

```python
from pydantic import BaseModel, ConfigDict, field_serializer
from pydantic.alias_generators import to_camel

class MoneyAmount(BaseModel):
    """Single-currency amount. Python attrs are snake_case; JSON/BSON keys are camelCase."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    currency: str        # ISO 4217, e.g. "MYR"
    exponent: int        # minor-unit digits (MYR=2, JPY=0, BHD=3)
    minor_units: int     # AUTHORITATIVE integer total; all math uses this
    major: int           # minor_units // 10**exponent
    minor: str           # minor_units % 10**exponent, zero-padded to `exponent`

    # JSON wire only: emit big integers as strings (JS clients are unsafe > 2**53).
    # BSON/python dumps keep them as int, so Mongo stores int64.
    @field_serializer("minor_units", "major", when_used="json")
    def _ints_as_strings(self, v: int) -> str:
        return str(v)
```
- Write to Mongo with `doc.model_dump(by_alias=True)` (python mode -> camelCase keys, integer values).
- Return over the API with FastAPI's default JSON encoding (`mode="json"` -> `minorUnits`/`major` become strings).

`Money` (captured dual-currency price) nests two `MoneyAmount`s plus `fx_rate` (a `float` ratio) and `as_of` — see [`Data-Models.md`](Data-Models.md#1-multi-currency-money-structs-moneyamount--money).

### 1.3 `exponent` MUST Come From ISO 4217
- **MUST NOT** hardcode `exponent = 2`. Currencies differ (JPY=0, BHD/KWD=3). Always look it up from one source-of-truth map.

```python
ISO_4217_EXPONENT: dict[str, int] = {
    "MYR": 2, "USD": 2, "EUR": 2, "NPR": 2, "THB": 2, "IDR": 2,
    "JPY": 0, "KRW": 0, "VND": 0,
    "BHD": 3, "KWD": 3, "OMR": 3,
    # Team to confirm: extend to the full currency set you support.
}

def exponent_of(currency: str) -> int:
    try:
        return ISO_4217_EXPONENT[currency]
    except KeyError:
        raise UnknownCurrencyError(currency)  # mapped to ERR_UNKNOWN_CURRENCY at the boundary
```

### 1.4 Conversion Helper (the only sanctioned way to build money)
Never split `major` / `minor` by hand.

```python
def to_money_amount(minor_units: int | str, currency: str) -> MoneyAmount:
    exponent = exponent_of(currency)
    value = int(minor_units)                 # accepts 4400 or "4400"; rejects floats/garbage
    factor = 10 ** exponent
    minor = "" if exponent == 0 else str(value % factor).zfill(exponent)
    return MoneyAmount(
        currency=currency,
        exponent=exponent,
        minor_units=value,
        major=value // factor,               # integer floor division
        minor=minor,
    )
```
> Amounts are non-negative in the MVP (no refunds). If negative values are introduced, revisit the `%` / `zfill` logic.

### 1.5 FX Conversion Happens Once
The FX rate is the **only** non-integer touching money, and only at capture:
```python
# local_minor arrives as an integer-string from the agent; round to integer display minor units.
display_minor = round(int(local_minor) * fx_rate)   # round() returns int in Python 3
```
After capture the result is a frozen `int` (`display.minorUnits`); no read path ever re-multiplies money by a fraction.

### 1.6 Budget Guard Is Integer-Only
Express the `x 1.5` daily allowance as `x 3 // 2` so it stays integer:
```python
# (remaining / days) * 1.5  ==  remaining * 3 // (days * 2)
threshold_minor = remaining_budget_minor * 3 // (remaining_days * 2)
in_budget = choice_estimated_cost_minor <= threshold_minor
```

---

## 2. Geospatial Ordering Law

MongoDB `2dsphere` indexes and aggregations are unforgiving: a swapped coordinate silently teleports the user or breaks the query.

### 2.1 Coordinate Order
- GeoJSON arrays **MUST** be **`[longitude, latitude]`** — longitude first.

```python
coordinates = [27.7172, 85.3240]  # WRONG — [lat, lon]
coordinates = [85.3240, 27.7172]  # CORRECT — [lon, lat]
```

### 2.2 `$geoNear` Must Be Stage 1
- When running a geo recall on `locations` (or `nodes`), **`$geoNear` MUST be the first stage** of the aggregation pipeline. Never place `$match`, `$lookup`, etc. before it (MongoDB rejects this). Apply `$match` (e.g. tag dedup) and `$limit` *after* `$geoNear`.

### 2.3 Index Prerequisite
- Any collection queried by `$geoNear`/`$near` **MUST** have a `2dsphere` index on the queried GeoJSON field (`locations.geoPoint`, `nodes.location.coordinates`).

### 2.4 Combining Geo + Vector (Two-Step Retrieval)
- Both `$geoNear` **and** `$vectorSearch` must be the **first** stage of their pipeline, so they **MUST NOT** be combined in one aggregation. To rank reachable places by semantic vibe (choice generation), run **two steps**:
  1. `$geoNear` on `locations` -> collect the reachable candidate `placeId`s within the radius (apply tag dedup here).
  2. `$vectorSearch` on `locations.embedding` with `filter: {"placeId": {"$in": reachable_ids}, "tags": {"$nin": visited_tags}}` -> vibe-rank only those candidates.
- The vector index **MUST** declare `placeId` and `tags` as `filter` fields for step 2 to work. See [`MCP-Tools.md`](MCP-Tools.md) `get_reachable_locations` for the reference implementation.

---

## 3. Input Validation Law (Pydantic at Every Boundary)

LLM output and external API data are untrusted. Every REST and MCP **input MUST be validated at the boundary with a Pydantic model** that mirrors [`Data-Models.md`](Data-Models.md). Reject *before* touching MongoDB; never trust raw agent JSON. FastAPI validates request bodies through these models automatically; MCP handlers call `Model.model_validate(...)` explicitly.

```python
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

OBJECT_ID = re.compile(r"^[a-f\d]{24}$", re.I)

class CreateNodeInput(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    journey_id: str
    day_number: int = Field(ge=1)
    order_in_day: int = Field(ge=0)
    title: str = Field(min_length=1)
    seeded_by_choice_id: str | None = None
    place_id: str | None = None
    price_category: Literal["accommodation", "food", "transport", "entry", "other"]
    price: "PriceInput"

    @field_validator("journey_id", "seeded_by_choice_id")
    @classmethod
    def _object_id(cls, v: str | None) -> str | None:
        if v is not None and not OBJECT_ID.match(v):
            raise ValueError("invalid ObjectId")
        return v

class PriceInput(BaseModel):
    local_currency: str = Field(min_length=3, max_length=3)
    local_minor_units: str = Field(pattern=r"^\d+$")   # string -> int downstream
    fx_rate: float = Field(gt=0)
```
- **MUST** parse money fields as **strings** (`local_minor_units`), then `int(...)` them — never `float`/`int` JSON numbers for `minorUnits`.
- Validation failures (`ValidationError`) **MUST** be mapped to the structured error contract in §4 (`ERR_VALIDATION`), not surfaced as raw 500s.

---

## 4. MCP Resiliency & Error Contract

When Gemini (latest **Gemini Pro** via Agent Builder) calls a backend tool, a raw 500 / traceback corrupts the agent's reasoning. Every MCP tool **MUST** degrade into a structured result.

### 4.1 Structured Error Response
On any business failure, return this contract (never raise to the transport):
```json
{
  "isSuccess": false,
  "errorCode": "ERR_BUDGET_EXHAUSTED",
  "errorMessage": "Remaining daily budget is insufficient for this option.",
  "fallbackAction": "FORCE_SLOW_TRAVEL"
}
```
- `errorCode` **MUST** be an `UPPER_SNAKE_CASE` constant from the matrix below.
- `fallbackAction` is a machine-readable hint that tells Gemini how to recover.
- Success responses use `{"isSuccess": true, ...}`.

```python
def error_contract(code: str, message: str, fallback: str) -> dict:
    return {"isSuccess": False, "errorCode": code, "errorMessage": message, "fallbackAction": fallback}
```

### 4.2 Standard Error-Code Matrix
| `errorCode` | Trigger | Suggested `fallbackAction` |
|---|---|---|
| `ERR_VALIDATION` | Pydantic boundary validation failed | `RETRY_WITH_FIXED_SCHEMA` |
| `ERR_GEOSPATIAL_EMPTY` | `$geoNear` returns nothing within the radius | `EXPAND_RADIUS` (200km -> 400km) |
| `ERR_BUDGET_EXHAUSTED` | Remaining budget too low for the option | `FORCE_SLOW_TRAVEL` |
| `ERR_FX_DRIFT` | FX rate cache expired / stale | `REFRESH_FX_RATE` |
| `ERR_UNKNOWN_CURRENCY` | Currency missing from the ISO 4217 exponent map | `ASK_USER_CURRENCY` |
| `ERR_NOT_FOUND` | `journeyId` / document does not exist | `ABORT` |
> Team to confirm: extend the matrix as new tools land; keep it the single source of error codes shared with the prompt layer.

### 4.3 Never Leak Internals
- **MUST NOT** return tracebacks, raw driver errors, or connection strings to the agent. Log them server-side (§8) and surface only the contract above. A global FastAPI exception handler maps uncaught exceptions to `ERR_*` contracts.

---

## 5. Performance & Token Economy

Gemini context billing escalates fast, and large payloads slow rendering.

### 5.1 Always Project Out the Vector
For normal business reads (rendering a journey, listing journal days) — anything that is **not** a vector similarity search — you **MUST** exclude the 1024-dim `embedding` field.

```python
cursor = db.nodes.find({"journeyId": journey_id}, projection={"embedding": 0})
nodes = await cursor.to_list(length=None)   # never ship the 1024-dim vector down render paths
```
> Note: Base64 image bytes are **not** stored on `nodes`. Heavy media lives in the optional `AssetCache` collection (see [`Data-Models.md`](Data-Models.md)) and is resolved lazily by the client, so there is nothing extra to project out of `nodes`.

### 5.2 Cap Candidate Fan-Out to the LLM
- Geo/recall pipelines feeding the agent **MUST** `$limit` to a small Top-N (<= 10) after `$geoNear`, so only reachable, deduped candidates reach the context window.

### 5.3 Lean Tool Responses
- MCP tool responses **SHOULD** return only the fields the agent needs to reason, not whole documents.

---

## 6. Streaming JSON

When the agent's day output is streamed to the client, a dropped connection can deliver truncated JSON.

- The backend **SHOULD** relay the model stream to the client with FastAPI `StreamingResponse` (or SSE via `sse-starlette`); never buffer the whole response if it can stream.
- The backend **MUST** validate the **assembled** result with the Pydantic response model before persisting; **MUST NOT** persist a partial/unvalidated object.
- The Next.js client does the progressive render and tolerant parse; if the stream breaks before the `choices` array closes, the client's skeleton UI fills the gap.
- If the backend itself must parse mid-stream, use an incremental parser (**Team to confirm: standardize on one** — e.g. `ijson` or `json-stream`); do not call `json.loads` on a partial buffer.

---

## 7. Naming, Structure & Code Conventions

### 7.1 Naming
- Modules / files: `snake_case.py` (`money.py`, `get_reachable_locations.py`).
- Classes / Pydantic models: `PascalCase` (`MoneyAmount`, `CreateNodeInput`).
- Functions / variables: `snake_case`. MCP tool names: `snake_case` matching the registered tool (`get_reachable_locations`).
- Constants & error codes: `UPPER_SNAKE_CASE`.
- **DB / JSON keys stay `camelCase`** (as defined in `Data-Models.md`, and friendly to the JS frontend); Python attributes are `snake_case` and bridged by Pydantic `alias_generator=to_camel` + `populate_by_name=True`. Do **not** rename DB fields to snake_case.
- Integer-minor-unit fields keep the `Minor` suffix on the wire (`remainingBudgetMinor`, `localMinorUnits`).

### 7.2 Suggested Project Structure
```
/app
  main.py                # FastAPI app factory, exception handlers, router mounting
  /routers               # HTTP route handlers (thin: validate -> service -> respond)
  /mcp                   # MCP tool handlers (one module per tool) + server bootstrap
  /services              # business logic (journey state machine, choice generation)
  /lib
    money.py             # MoneyAmount/Money + exponent_of + to_money_amount (§1)
    geo.py               # coordinate + $geoNear / $vectorSearch helpers (§2)
    db.py                # Motor client/singleton
    errors.py            # error_contract() + error-code constants (§4)
  /schemas               # Pydantic models mirroring Data-Models (§3)
  /settings.py           # pydantic-settings BaseSettings (§9)
/tests                   # pytest suites (see Testing-Plan.md)
pyproject.toml           # uv-managed deps, ruff/black/mypy config
```
> Team to confirm the exact layout before scaffolding.

### 7.3 Async & Control Flow
- **MUST** use `async def` handlers and `await` all Motor calls; **MUST NOT** make blocking calls (sync I/O, `time.sleep`, sync `pymongo`) inside the event loop. Use `asyncio.gather` for independent awaits.
- **MUST** return the structured error contract (§4) at MCP/REST boundaries; reserve `raise` for truly unexpected faults caught by the global handler.
- **SHOULD** keep route handlers thin: validate (§3) -> call a service -> serialize/project -> respond.

### 7.4 Database Access
- All cross-collection links are `ObjectId` except `userId` (frontend string) and `placeId` (Google string) — see the relationship matrix in [`Data-Models.md`](Data-Models.md).
- State transitions on `journeys` **MUST** be atomic (`find_one_and_update` with `$set`/`$inc`/`$addToSet`), as shown in `MCP-Tools.md` `update_journey`.

---

## 8. Error Handling, Logging & Observability

- **MUST** centralize error-to-contract mapping in one `errors.py` helper; handlers call `error_contract(code, message, fallback)` rather than hand-building dicts.
- **MUST** log server-side with **structured (JSON) logs** including a correlation id and `journeyId` where available, so a failed agent turn is traceable.
- **MUST NOT** log secrets, full connection strings, or raw user PII.
- **SHOULD** log every MCP tool call with tool name, `journeyId`, duration, and `isSuccess`.
- Team to confirm the logging library (recommend `structlog`, or stdlib `logging` with a JSON formatter).

---

## 9. Configuration & Secrets

- **MUST** read all credentials (MongoDB URI, Voyage key, Google/Vertex, FX key) from environment variables — see the env list in [`README.md`](../../README.md). Never hardcode or commit secrets.
- **MUST** load and validate config with **`pydantic-settings`** (`BaseSettings`) at startup, and **fail fast** if a required variable is missing.
- **MUST NOT** expose MongoDB credentials to the frontend; the browser talks only to the API layer.

---

## 10. Dependencies & Tooling

- **MUST** manage dependencies with **uv** and commit the lockfile (`uv.lock`); pin runtime-critical versions — no unbounded ranges.
- **MUST** target **Python 3.12** (Team to confirm).
- **SHOULD** enforce these standards mechanically: **ruff** (lint) + **black** (format) + **mypy** (`strict = true`), wired into pre-commit / CI.
- **MUST NOT** pin a Gemini minor version in code or config; target the latest **Gemini Pro** available in Agent Builder.

---

## Quick Checklist (for PRs and AI agents)

- [ ] No float/Decimal for money; `minor_units` is `int`, `exponent` from ISO 4217.
- [ ] `minorUnits` / `major` serialized as **strings** on every wire boundary (int in BSON).
- [ ] GeoJSON is `[longitude, latitude]`; `$geoNear` is pipeline stage 1; geo+vector is two-step.
- [ ] Boundary inputs validated with Pydantic before any DB call.
- [ ] Failures return the structured MCP error contract — no raw 500s/tracebacks to the agent.
- [ ] `embedding` projected out of non-vector reads; candidate fan-out `$limit`ed.
- [ ] All Motor calls awaited; no blocking I/O in async paths.
- [ ] No secrets in code/logs; config validated via pydantic-settings at startup.
