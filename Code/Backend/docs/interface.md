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

Every response also carries an `X-Trace-Id` header. Send your own
`X-Trace-Id` to correlate, or let the gateway mint a unique one. The same id is
stamped on every log line across all per-service log folders, so
`grep <traceid> logs/**/*.log` reconstructs one request end-to-end.

## Operations

| `X-Operation-Type` | Internal RPC method | Request body | Response `data` |
| --- | --- | --- | --- |
| `HEALTH_PING`      | `system.ping`       | `{}` | `{ pong, env, methods[] }` |
| `JOURNEY_START`    | `journey.start`     | `JourneyStartRequest` | `{ journey_id, state, day }` |
| `JOURNEY_NEXT_DAY` | `journey.next_day`  | `JourneyNextDayRequest` | `{ journey_id, chosen, day }` |
| `BUDGET_CHECK`     | `budget.check`      | `BudgetCheckRequest` | `BudgetCheckResult` |
| `GEO_REACHABLE`    | `geo.reachable`     | `GeoReachableRequest` | `{ count, locations[] }` |

Request/response shapes are defined authoritatively in
[`app/models/schemas.py`](../app/models/schemas.py).

## Errors

| Status | Meaning |
| --- | --- |
| `400` | unknown/unrouted operation, or malformed JSON body |
| `401` | `GATEWAY_API_KEY` set and `X-Api-Key` missing/wrong |
| `422` | `X-Operation-Type` header missing |
| `503` | operation valid but its service is not registered |

A handled service error returns `200` with `{ "ok": false, "error": "..." }`.

## Example

```bash
curl -s -X POST http://localhost:8080/api/gateway \
  -H "X-Operation-Type: BUDGET_CHECK" \
  -H "Content-Type: application/json" \
  -d '{"remaining_minor":100000,"remaining_days":5,"option_cost_minor":25000,"currency":"MYR"}'
```
