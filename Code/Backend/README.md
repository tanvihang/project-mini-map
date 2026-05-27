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
  models/schemas.py  Pydantic contracts (Node, Money, requests)
  services/
    journey/         ADK agent + state machine (nondeterministic, isolated)
    budget/          deterministic per-day budget circuit-breaker
    geo_mcp/         $geoNear over Mongo, exposed via FastMCP
```

See [`docs/architecture.md`](docs/architecture.md) and
[`docs/interface.md`](docs/interface.md).

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
