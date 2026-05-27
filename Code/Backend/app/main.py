"""FastAPI entry point — the only process started in production.

On startup it wires every logical microservice into the RPC registry and runs
non-fatal connectivity checks. Nothing here blocks the event loop.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.gateway import router as gateway_router
from app.core import security
from app.core.config import (
    close_clients,
    enforce_required_settings,
    get_settings,
)
from app.core.errors import ERR_INTERNAL, ERR_VALIDATION, error_contract
from app.core.logging_config import (
    configure_logging,
    new_trace_id,
    trace_id_var,
)
from app.core.rpc import rpc
from app.services.budget import service as budget_service
from app.services.geo_mcp import service as geo_service
from app.services.journey import service as journey_service

logger = logging.getLogger("minimap.system")


def _register_services() -> None:
    """Wire every service's RPC methods. Idempotent (clears first)."""
    rpc.clear()

    async def ping(_payload: dict) -> dict:
        return {
            "pong": True,
            "env": get_settings().app_env,
            "methods": rpc.methods(),
        }

    rpc.register("system.ping", ping)
    journey_service.register(rpc)
    budget_service.register(rpc)
    geo_service.register(rpc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup/shutdown: register services, probe creds, close clients."""
    settings = get_settings()
    configure_logging(settings.log_level)
    enforce_required_settings()  # §9 fail-fast in production

    _register_services()
    logger.info("registered RPC methods: %s", rpc.methods())
    logger.info("GCP ADC status: %s", security.verify_gcp_credentials())

    yield

    await close_clients()


app = FastAPI(title="Mini-Map Backend", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def trace_id_middleware(request: Request, call_next):
    """Assign a TraceID per request and echo it back in the response header.

    Honours an inbound ``X-Trace-Id`` (so a caller can correlate) and otherwise
    mints a unique one. The id is exposed on ``request.state`` for handlers and
    returned on every response — success or error.
    """
    tid = request.headers.get("X-Trace-Id") or new_trace_id()
    token = trace_id_var.set(tid)
    request.state.trace_id = tid
    try:
        response = await call_next(request)
    finally:
        trace_id_var.reset(token)
    response.headers["X-Trace-Id"] = tid
    return response


app.include_router(gateway_router)


@app.exception_handler(RequestValidationError)
async def _validation_handler(_request: Request, _exc: RequestValidationError):
    """Map request-validation failures to the ERR_VALIDATION contract (§3)."""
    return JSONResponse(
        status_code=422,
        content=error_contract(ERR_VALIDATION, "request validation failed"),
    )


@app.exception_handler(Exception)
async def _unhandled_handler(_request: Request, _exc: Exception):
    """Never leak internals: map uncaught errors to the ERR_INTERNAL contract (§4.3)."""
    logger.exception("unhandled error")
    return JSONResponse(
        status_code=500, content=error_contract(ERR_INTERNAL, "internal error")
    )


@app.get("/healthz")
async def healthz() -> dict:
    """Liveness probe (does not touch external services)."""
    return {"status": "ok"}
