# Project Mini Map — Backend Coding Standards v1.0

This document defines the coding standards for the Node.js / TypeScript backend and Next.js API Routes of Project Mini Map. **Every human developer and every collaborating AI agent must follow it strictly** to guarantee financial-grade money accuracy, correct geospatial computation, and resilient LLM / MCP integration.

It is the companion of:
- [`Data-Models.md`](Data-Models.md) — the authoritative MongoDB schemas (`MoneyAmount` / `Money`, collections, indexes).
- [`MCP-Tools.md`](MCP-Tools.md) — the MCP tool contracts the agent calls.

> **Conventions in this doc:** "MUST" / "MUST NOT" are hard rules (CI / review should reject violations). "SHOULD" is a strong default you may deviate from with a written reason. Items marked **Team to confirm** are concrete choices that need a one-time team decision; sensible defaults are given.

---

## 1. Money Handling Law (Financial-Grade)

JavaScript's `Number` is an IEEE-754 double, so decimal arithmetic loses precision (`0.1 + 0.2 === 0.30000000000000004`). To eliminate money errors entirely:

### 1.1 Storage & Computation
- **MUST NOT** use floating-point or decimal values for money anywhere (no `totalSpent: 44.20`, no `NumberDecimal`).
- **MUST** store every amount as an **integer count of the currency's minor unit**:
  - MYR 44.00 → `4400` (44 × 10²).
  - JPY 1000 → `1000` (JPY has no minor unit, exponent 0, so 1000 × 10⁰).
- **Authoritative math:** all budget deductions, category rollups, and comparisons **MUST** use **`BigInt`** (in-process) or **`NumberLong`** (BSON) integer arithmetic on `minorUnits`. Never convert back to a float to "do the math."

### 1.2 Two Representations: Domain vs Wire
`minorUnits` and `major` are `bigint` **in process**, but `JSON.stringify` cannot serialize `bigint`, and JS numbers are unsafe above 2⁵³. Therefore, on **every wire boundary (MCP and REST), `minorUnits` and `major` MUST be transmitted as decimal strings.** `exponent` stays a number (it is small and not money).

```typescript
// Domain model — used for ALL in-process arithmetic
interface MoneyAmount {
  currency: string;     // ISO 4217, e.g. "MYR"
  exponent: number;     // minor-unit digits from ISO 4217 (MYR=2, JPY=0, BHD=3)
  minorUnits: bigint;   // authoritative integer total (maps to BSON NumberLong)
  major: bigint;        // minorUnits / 10^exponent
  minor: string;        // minorUnits % 10^exponent, zero-padded to `exponent`
}

// Wire DTO — what crosses MCP / REST as JSON (string-safe)
interface MoneyAmountDTO {
  currency: string;
  exponent: number;
  minorUnits: string;   // bigint as decimal string — NEVER a JS number
  major: string;
  minor: string;
}
```
`Money` (captured dual-currency price) nests two `MoneyAmount`s plus `fxRate` (a `number` ratio) and `asOf` — see [`Data-Models.md`](Data-Models.md#1-multi-currency-money-structs-moneyamount--money).

### 1.3 `exponent` MUST Come From ISO 4217
- **MUST NOT** hardcode `exponent: 2`. Currencies differ (JPY=0, BHD/KWD=3). Always look it up from a single source-of-truth map.

```typescript
const ISO_4217_EXPONENT: Record<string, number> = {
  MYR: 2, USD: 2, EUR: 2, NPR: 2, THB: 2, IDR: 2,
  JPY: 0, KRW: 0, VND: 0,
  BHD: 3, KWD: 3, OMR: 3,
  // Team to confirm: extend to the full currency set you support.
};

export function exponentOf(currency: string): number {
  const e = ISO_4217_EXPONENT[currency];
  if (e === undefined) throw new Error(`ERR_UNKNOWN_CURRENCY: ${currency}`);
  return e;
}
```

### 1.4 Conversion Helpers (the only sanctioned way to build/emit money)
Never split `major` / `minor` by hand.

```typescript
// Build a domain MoneyAmount from an integer minor-unit value.
export function toMoneyAmount(minorUnitsInput: bigint | string, currency: string): MoneyAmount {
  const exponent = exponentOf(currency);
  const minorUnits = BigInt(minorUnitsInput);          // accepts "4400" or 4400n; rejects floats
  const factor = 10n ** BigInt(exponent);              // exact BigInt power — never Math.pow
  const major = minorUnits / factor;
  const minor = exponent === 0 ? "" : (minorUnits % factor).toString().padStart(exponent, "0");
  return { currency, exponent, minorUnits, major, minor };
}

// Convert a domain MoneyAmount to the JSON-safe wire DTO at the boundary.
export function serializeMoney(m: MoneyAmount): MoneyAmountDTO {
  return { ...m, minorUnits: m.minorUnits.toString(), major: m.major.toString() };
}
```
> Amounts are non-negative in the MVP (no refunds). If negative values are ever introduced, revisit the `%` / `padStart` logic.

### 1.5 FX Conversion Happens Once
The FX rate is the **only** non-integer touching money, and only at capture:
```typescript
// localMinorUnits arrives as a string from the agent; round to integer display minor units.
const displayMinor = BigInt(Math.round(Number(localMinorUnits) * fxRate));
```
After capture the result is a frozen integer (`display.minorUnits`); no read path ever re-multiplies money by a fraction.

### 1.6 Budget Guard Is Integer-Only
Express the `× 1.5` daily allowance as `× 3 ÷ 2` so it stays in `BigInt`:
```typescript
// (remaining / days) * 1.5  ≡  remaining * 3 / (days * 2)
const thresholdMinor = (remainingBudgetMinor * 3n) / (BigInt(remainingDays) * 2n);
const inBudget = choice.estimatedCost.minorUnits <= thresholdMinor;
```

---

## 2. Geospatial Ordering Law

MongoDB `2dsphere` indexes and aggregations are unforgiving: a swapped coordinate silently teleports the user or breaks the query.

### 2.1 Coordinate Order
- GeoJSON arrays **MUST** be **`[longitude, latitude]`** — longitude first.

```javascript
const coordinates = [27.7172, 85.3240]; // WRONG — [lat, lon]
const coordinates = [85.3240, 27.7172]; // CORRECT — [lon, lat]
```

### 2.2 `$geoNear` Must Be Stage 1
- When running a geo recall on `locations` (or `nodes`), **`$geoNear` MUST be the first stage** of the aggregation pipeline. Never place `$match`, `$lookup`, etc. before it (MongoDB rejects this). Apply `$match` (e.g. tag dedup) and `$limit` *after* `$geoNear`.

### 2.3 Index Prerequisite
- Any collection queried by `$geoNear`/`$near` **MUST** have a `2dsphere` index on the queried GeoJSON field (`locations.geoPoint`, `nodes.location.coordinates`).

### 2.4 Combining Geo + Vector (Two-Step Retrieval)
- Both `$geoNear` **and** `$vectorSearch` must be the **first** stage of their pipeline, so they **MUST NOT** be combined in a single aggregation. To rank reachable places by semantic vibe (choice generation), run **two steps**:
  1. `$geoNear` on `locations` → collect the reachable candidate `placeId`s within the radius (apply tag dedup here).
  2. `$vectorSearch` on `locations.embedding` with `filter: { placeId: { $in: reachableIds }, tags: { $nin: visitedTags } }` → vibe-rank only those candidates.
- The vector index **MUST** declare `placeId` and `tags` as `filter` fields for step 2 to work. See [`MCP-Tools.md`](MCP-Tools.md) `get_reachable_locations` for the reference implementation.

---

## 3. Input Validation Law (Zod at Every Boundary)

LLM output and external API data are untrusted. Every REST and MCP **input MUST be validated at the boundary with a [Zod](https://zod.dev) schema** that mirrors [`Data-Models.md`](Data-Models.md). Reject *before* touching MongoDB; never trust raw agent JSON.

```typescript
import { z } from "zod";

const ObjectIdString = z.string().regex(/^[a-f\d]{24}$/i, "invalid ObjectId");
const MinorUnitsString = z.string().regex(/^\d+$/, "minorUnits must be a non-negative integer string");

export const CreateNodeInput = z.object({
  journeyId: ObjectIdString,
  dayNumber: z.number().int().min(1),
  orderInDay: z.number().int().min(0),
  title: z.string().min(1),
  seededByChoiceId: ObjectIdString.nullable().optional(),
  placeId: z.string().nullable().optional(),
  priceCategory: z.enum(["accommodation", "food", "transport", "entry", "other"]),
  price: z.object({
    localCurrency: z.string().length(3),
    localMinorUnits: MinorUnitsString,   // string -> BigInt downstream
    fxRate: z.number().positive(),
  }),
  // ...mirror the rest of the nodes schema
});

// At the handler boundary:
const parsed = CreateNodeInput.safeParse(rawInput);
if (!parsed.success) {
  return errorContract("ERR_VALIDATION", parsed.error.message, "RETRY_WITH_FIXED_SCHEMA");
}
```
- **MUST** parse money fields as **strings** (`MinorUnitsString`), then `BigInt(...)` them — never `z.number()` for `minorUnits`.
- Validation failures **MUST** be mapped to the structured error contract in §4, not thrown as raw 500s.

---

## 4. MCP Resiliency & Error Contract

When Gemini (latest **Gemini Pro** via Agent Builder) calls a backend tool, a raw 500 stack trace corrupts the agent's reasoning. Every MCP tool **MUST** degrade into a structured result.

### 4.1 Structured Error Response
On any business failure, return this JSON contract (never throw to the transport):
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
- Success responses use `{ "isSuccess": true, ... }`.

### 4.2 Standard Error-Code Matrix
| `errorCode` | Trigger | Suggested `fallbackAction` |
|---|---|---|
| `ERR_VALIDATION` | Zod boundary validation failed | `RETRY_WITH_FIXED_SCHEMA` |
| `ERR_GEOSPATIAL_EMPTY` | `$geoNear` returns nothing within the radius | `EXPAND_RADIUS` (200km → 400km) |
| `ERR_BUDGET_EXHAUSTED` | Remaining budget too low for the option | `FORCE_SLOW_TRAVEL` |
| `ERR_FX_DRIFT` | FX rate cache expired / stale | `REFRESH_FX_RATE` |
| `ERR_UNKNOWN_CURRENCY` | Currency missing from the ISO 4217 exponent map | `ASK_USER_CURRENCY` |
| `ERR_NOT_FOUND` | `journeyId` / document does not exist | `ABORT` |
> Team to confirm: extend the matrix as new tools land; keep it the single source of error codes shared with the prompt layer.

### 4.3 Never Leak Internals
- **MUST NOT** return stack traces, raw driver errors, or connection strings to the agent. Log them server-side (§7) and surface only the contract above.

---

## 5. Performance & Token Economy

Gemini context billing escalates fast, and large payloads slow rendering.

### 5.1 Always Project Out the Vector
For normal business reads (rendering a journey, listing journal days) — i.e. anything that is **not** a vector similarity search — you **MUST** exclude the 1024-dim `embedding` field.

```typescript
const nodes = await db.collection("nodes")
  .find({ journeyId })
  .project({ embedding: 0 })   // never ship the 1024-dim vector down render paths
  .toArray();
```
> Note: Base64 image bytes are **not** stored on `nodes`. Heavy media lives in the optional `AssetCache` collection (see [`Data-Models.md`](Data-Models.md)) and is resolved lazily by the client, so there is nothing extra to project out of `nodes`.

### 5.2 Cap Candidate Fan-Out to the LLM
- Geo/recall pipelines feeding the agent **MUST** `$limit` to a small Top-N (≤ 10) after `$geoNear`, so only reachable, deduped candidates reach the context window.

### 5.3 Lean Tool Responses
- MCP tool responses **SHOULD** return only the fields the agent needs to reason, not whole documents.

---

## 6. Streaming JSON Parsing

When Gemini streams JSON through a Next.js Route, a dropped connection can deliver truncated JSON.

- **MUST NOT** call `JSON.parse` on a partial stream and let the page throw.
- **MUST** parse progressively in the proxy layer with a streaming/partial parser (**Team to confirm: standardize on one** — `partial-json-parser` for lightweight partial objects, or `oboe.js` for event-driven streaming).
- If the stream breaks before the `choices` array closes, the backend **SHOULD** optimistically close the structure and return what it has, letting the frontend skeleton UI fill the gap.

---

## 7. Naming, Structure & Code Conventions

> The rules below are the recommended baseline for a TypeScript / Next.js (App Router) + MongoDB backend. Team to confirm the specifics marked inline.

### 7.1 Naming
- Files: `kebab-case.ts` (`money-utils.ts`, `get-reachable-locations.ts`).
- Types / interfaces: `PascalCase` (`MoneyAmount`, `CreateNodeInput`).
- Functions / variables: `camelCase`. MCP tool names: `snake_case` matching the registered tool (`get_reachable_locations`).
- Constants & error codes: `UPPER_SNAKE_CASE`.
- Money fields always carry the `Minor` suffix when they are integer minor units (`remainingBudgetMinor`, `localMinorUnits`).

### 7.2 Suggested Project Structure
```
/src
  /app/api/...           # Next.js Route handlers (thin — validate, call service, serialize)
  /mcp                   # MCP tool handlers (one file per tool)
  /services              # business logic (journey state machine, choice generation)
  /lib
    money.ts             # MoneyAmount/Money helpers (§1)
    geo.ts               # coordinate + $geoNear helpers (§2)
    db.ts                # Mongo client/singleton
    errors.ts            # errorContract() + error-code constants (§4)
  /schemas               # Zod schemas mirroring Data-Models (§3)
  /types                 # shared TS types/interfaces
```
> Team to confirm the exact layout before scaffolding.

### 7.3 Async & Control Flow
- **MUST** `await` every promise; no floating promises (enable the lint rule).
- **MUST** use the structured error contract (§4) at MCP/REST boundaries; reserve `throw` for truly unexpected internal faults caught by the central handler.
- **SHOULD** keep Route handlers thin: validate (§3) → call a service → `serializeMoney`/project → respond.

### 7.4 Database Access
- All cross-collection links are `ObjectId` except `userId` (frontend string) and `placeId` (Google string) — see the relationship matrix in [`Data-Models.md`](Data-Models.md).
- State transitions on `journeys` **MUST** be atomic (`findOneAndUpdate` with `$set`/`$inc`/`$addToSet`), as shown in `MCP-Tools.md` `update_journey`.

---

## 8. Error Handling, Logging & Observability

- **MUST** centralize error-to-contract mapping in one `errors.ts` helper; handlers call `errorContract(code, message, fallback)` rather than hand-building JSON.
- **MUST** log server-side with **structured (JSON) logs** including a correlation id and `journeyId` where available, so a failed agent turn is traceable.
- **MUST NOT** log secrets, full connection strings, or raw user PII.
- **SHOULD** log every MCP tool call with tool name, `journeyId`, duration, and `isSuccess`.
- Team to confirm the logging library (recommend `pino` for structured, low-overhead logs).

---

## 9. Configuration & Secrets

- **MUST** read all credentials (MongoDB URI, Voyage key, Google/Vertex, FX key) from environment variables — see the env list in [`README.md`](README.md). Never hardcode or commit secrets.
- **MUST** fail fast at startup if a required env var is missing (validate the process env with a Zod schema too).
- **MUST NOT** expose MongoDB credentials to the frontend; the browser talks only to the API layer.

---

## 10. Dependencies & Tooling

- **MUST** pin dependency versions (commit the lockfile); no floating `^`/`latest` for runtime-critical libs.
- **MUST** target a single Node.js LTS (Team to confirm — recommend Node 20.x).
- **SHOULD** enforce these standards mechanically: ESLint + Prettier, `@typescript-eslint/no-floating-promises`, and `strict: true` in `tsconfig.json`.
- **MUST NOT** pin a Gemini minor version in code or config; target the latest **Gemini Pro** available in Agent Builder.

---

## Quick Checklist (for PRs and AI agents)

- [ ] No floats/decimals for money; `minorUnits` is `BigInt`/`NumberLong`, `exponent` from ISO 4217.
- [ ] `minorUnits` / `major` serialized as **strings** on every wire boundary.
- [ ] GeoJSON is `[longitude, latitude]`; `$geoNear` is pipeline stage 1.
- [ ] Boundary inputs validated with Zod before any DB call.
- [ ] Failures return the structured MCP error contract — no raw 500s to the agent.
- [ ] `embedding` projected out of non-vector reads; candidate fan-out `$limit`ed.
- [ ] No secrets in code/logs; all promises awaited.
