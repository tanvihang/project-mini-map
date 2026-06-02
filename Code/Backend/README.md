# Mini-Map Backend

Single-gateway **modular monolith** (logical microservices) on FastAPI. One
public endpoint routes by the `X-Operation-Type` header; services are decoupled
packages that talk only through an in-process async RPC registry. Fully async.

```
app/
  main.py            FastAPI entry (the only process in prod)
  api/gateway.py     the single public edge: X-Operation-Type -> RPC
  core/
    config.py        settings + lazy Vertex/Mongo singletons
    rpc.py           async RPC registry (name -> handler)
    security.py      ADC check, gateway key, audit
    money.py         integer minor-unit money handling
    errors.py        structured error contract
    logging_config.py trace ID propagation
  models/schemas.py  Pydantic contracts (Node, Money, requests)
  services/
    journey/         ADK agent + state machine (nondeterministic, isolated)
    budget/          deterministic per-day budget circuit-breaker
    geo_mcp/         $geoNear over Mongo, exposed via FastMCP
    chat/            conversational travel agent with session management
    user/            registration + authentication (bcrypt hashed passwords)
    waypoint/        manage stops between journey days
```

Built to the team standards in `docs/engineering` (mirrored under `docs/`):
integer-minor-unit money with string wire serialization (`app/core/money.py`),
the `{isSuccess, errorCode, fallbackAction}` error contract (`app/core/errors.py`),
`$geoNear`-stage-1 geo, camelCase `extra="forbid"` Pydantic boundaries, and the
integer budget guard. The data layer uses **Motor** per the standard (flagged as
EOL — a future migration to PyMongo async is advisable).

See [`docs/architecture.md`](docs/architecture.md).

## Services

| Service | RPC Methods | Description |
|---------|-------------|-------------|
| **journey** | `journey.start`, `journey.next_day`, `journey.list`, `journey.get` | Travel state machine + ADK agent integration |
| **budget** | `budget.check` | Deterministic per-day spend ceiling (`remaining × 3 // days × 2`) |
| **geo_mcp** | `geo.reachable` | `$geoNear` pipeline over MongoDB for reachable POIs |
| **chat** | `chat.send` | Conversational agent with session history and context |
| **user** | `user.register`, `user.login` | User auth with bcrypt passwords, MongoDB storage |
| **waypoint** | `waypoint.add`, `waypoint.remove`, `waypoint.suggest` | Manual/auto stops between journey days |

## Gateway Operations

The single `/api/gateway` endpoint accepts these `X-Operation-Type` values:

| Operation | RPC Method | Description |
|-----------|------------|-------------|
| `HEALTH_PING` | `system.ping` | Liveness check with env and registered methods |
| `USER_REGISTER` | `user.register` | Create new user account |
| `USER_LOGIN` | `user.login` | Authenticate and return user profile |
| `JOURNEY_START` | `journey.start` | Initialize a new travel journey |
| `JOURNEY_NEXT_DAY` | `journey.next_day` | Generate next day's itinerary |
| `JOURNEY_LIST` | `journey.list` | List user's journeys |
| `JOURNEY_GET` | `journey.get` | Fetch journey state by ID |
| `BUDGET_CHECK` | `budget.check` | Validate spend against daily ceiling |
| `GEO_REACHABLE` | `geo.reachable` | Query reachable POIs from coordinates |
| `CHAT_SEND` | `chat.send` | Send message to conversational agent |
| `WAYPOINT_ADD` | `waypoint.add` | Add manual waypoint to journey |
| `WAYPOINT_REMOVE` | `waypoint.remove` | Remove waypoint by index |
| `WAYPOINT_SUGGEST` | `waypoint.suggest` | Get suggested waypoints between days |

## Quick start (venv)

```bash
cd Code/Backend

# 1. Virtual environment (all work happens inside it)
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Dependencies
pip install -r requirements.txt

# 3. Environment
cp .env.example .env               # then fill in real values

# 4. (optional) Local MongoDB — needs Docker. Portable on WSL/Linux/macOS.
docker compose up -d
#   ...or skip Docker and point MONGODB_URI at MongoDB Atlas in .env

# 5. Run the API (async, auto-reload)
uvicorn app.main:app --reload --port 8080
```

Smoke test:

```bash
curl -s -X POST http://localhost:8080/api/gateway \
  -H "X-Operation-Type: HEALTH_PING" -d '{}'
```

## Auth note

The app boots **without** GCP credentials or a running MongoDB — those
singletons initialize lazily and degrade to stub mode, so you can exercise
gateway routing immediately. For live Gemini, authenticate once with ADC:

```bash
gcloud auth application-default login
```

## Geo MCP server (for the ADK agent)

```bash
python -m app.services.geo_mcp.server   # FastMCP over stdio
```

The journey agent connects to this via an ADK `MCPToolset`, so it can only
reach Mongo through the guarded `get_reachable_locations` tool.

## Tests

```bash
pytest
```

## Lint / format (Google style)

```bash
ruff check app tests
black app tests
```

## Locking dependencies

`requirements.txt` pins well-known packages with `==`. After the first clean
install, freeze the fast-moving Google/MCP packages to exact versions:

```bash
pip freeze | grep -Ei "google-genai|google-adk|fastmcp"
# then replace the >= lines in requirements.txt with the resolved ==
```