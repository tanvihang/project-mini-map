# Architecture — Deterministic Agent, Single Gateway

## Shape: modular monolith = logical microservices

One deployable FastAPI process. The three services are **decoupled packages**
that never import each other; they communicate only through the in-process RPC
registry. The boundary is real, so any service can later move to its own
process by swapping the RPC transport — no caller changes.

```
            ┌────────────────────────────────────────────┐
 Client ───▶│  POST /api/gateway  (the only public edge)  │
   X-Operation-Type                                        │
            │  parse header → routing table → rpc.call()   │
            └───────────────────────┬──────────────────────┘
                                     │
                          core/rpc.py (async registry)
                "service.method" name ─▶ async handler
                 ┌───────────────┬───────────────┐
                 ▼               ▼               ▼
            journey/         budget/         geo_mcp/
         ADK agent +      deterministic     query_reachable()
         state machine    per-day ceiling   $geoNear on Mongo
                 │                               │
                 │ (agent connects via MCP)      │ FastMCP server.py
                 └──────────────┬────────────────┘  python -m ...geo_mcp.server
                                ▼
                          MongoDB (Atlas / local Docker)
```

## Why RPC instead of direct imports (requirement: "like Java RPC")

`core/rpc.py` is a name→handler registry. Callers do
`await rpc.call("budget.check", payload)` and depend on a **string**, not a
module. This is the same location transparency a gRPC/RMI stub provides:
in-process today, network-pluggable tomorrow.

## Determinism boundaries

- **budget** is pure integer math — no model, fully reproducible. It is the
  hard financial circuit-breaker.
- **geo_mcp** enforces geographic reachability in code via `$geoNear`. The
  agent reaches it through a typed MCP tool and cannot craft a query that
  bypasses the constraint.
- **journey** owns the only nondeterministic surface (the LLM tool-loop),
  isolated behind `_run_agent`. Guards live outside it, in budget and geo.

## Async everywhere

`AsyncMongoClient`, async RPC handlers, and FastAPI's async routes mean no
handler blocks the event loop. Client singletons initialize lazily during the
lifespan startup and never block boot when infrastructure is absent.
