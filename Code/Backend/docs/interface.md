# Interface Contract — `X-Operation-Type`

The frontend talks to **one** endpoint. Business routing is selected by the
`X-Operation-Type` request header, not the URL path.

```
POST /api/gateway
Headers:
  X-Operation-Type: <OPERATION>     # required
  X-Api-Key: <key>                  # required only if GATEWAY_API_KEY is set
  Content-Type: application/json
Body: <operation-specific JSON object>   # empty body allowed -> {}
```

Every response uses the same envelope:

```json
{ "ok": true, "operation": "BUDGET_CHECK", "data": { ... }, "error": null }
```

`data` carries the service's structured result. On a business failure the
service returns the standard contract (`{ "isSuccess": false, "errorCode": ...,
"errorMessage": ..., "fallbackAction": ... }`); the gateway then sets
`ok: false` and copies `errorCode` into `error`. Money is always integer **minor
units transmitted as decimal strings** (`"30000"`), never floats.

Every response also carries an `X-Trace-Id` header. Send your own
`X-Trace-Id` to correlate, or let the gateway mint a unique one. The same id is
stamped on every log line across all per-service log folders, so
`grep <traceid> logs/**/*.log` reconstructs one request end-to-end.

## Operations

| `X-Operation-Type` | Internal RPC method | Request body (camelCase) | Success `data` |
| --- | --- | --- | --- |
| `HEALTH_PING`      | `system.ping`       | `{}` | `{ pong, env, methods[] }` |
| `USER_REGISTER`    | `user.register`     | `{ email, password, displayName? }` | `{ isSuccess, userId, email, displayName, createdAt }` |
| `JOURNEY_START`    | `journey.start`     | `{ userId, destination, totalDays, totalBudgetMinor, budgetCurrency, travelStyle, interests[] }` | `{ isSuccess, journeyId, state, day }` |
| `JOURNEY_NEXT_DAY` | `journey.next_day`  | `{ journeyId, chosenIndex }` | `{ isSuccess, journeyId, chosenIndex, day }` |
| `BUDGET_CHECK`     | `budget.check`      | `{ remainingBudgetMinor, remainingDays, estimatedCostMinor, currency }` | `{ isSuccess, approved, thresholdMinor, ... }` |
| `GEO_REACHABLE`    | `geo.reachable`     | `{ longitude, latitude, maxDistanceMeters?, excludeTags?[], interestQuery? }` | `{ isSuccess, candidates[] }` |

`minorUnits`-style amounts are decimal **strings**. Request/response shapes are
defined authoritatively in [`app/models/schemas.py`](../app/models/schemas.py),
which mirrors [`Data-Models.md`](Data-Models.md) and [`MCP-Tools.md`](MCP-Tools.md).

## Errors

| Status | Meaning |
| --- | --- |
| `400` | unknown/unrouted operation, or malformed JSON body |
| `401` | `GATEWAY_API_KEY` set and `X-Api-Key` missing/wrong |
| `422` | `X-Operation-Type` header missing (body = `ERR_VALIDATION` contract) |
| `503` | operation valid but its service is not registered |

A handled business failure returns `200` with `ok: false`, `error` = the
`errorCode`, and the full contract in `data`. Payloads that fail boundary
validation return `ok: false` with `error: "ERR_VALIDATION"`. Error codes:
`ERR_VALIDATION`, `ERR_GEOSPATIAL_EMPTY`, `ERR_BUDGET_EXHAUSTED`, `ERR_FX_DRIFT`,
`ERR_UNKNOWN_CURRENCY`, `ERR_NOT_FOUND`, `ERR_INTERNAL`.

## Example

```bash
curl -s -X POST http://localhost:8080/api/gateway \
  -H "X-Operation-Type: BUDGET_CHECK" \
  -H "Content-Type: application/json" \
  -d '{"remainingBudgetMinor":"100000","remainingDays":5,"estimatedCostMinor":"25000","currency":"MYR"}'
```
