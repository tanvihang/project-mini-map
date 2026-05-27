"""The single public gateway.

One endpoint. It reads ``X-Operation-Type``, maps it to exactly one internal
RPC method, and dispatches. Services are never imported here — the gateway only
knows operation names and the routing table.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Request

from app.core import security
from app.core.config import get_settings
from app.core.logging_config import trace_id_var
from app.core.rpc import MethodNotFound, rpc
from app.models.schemas import GatewayResponse, OperationType

logger = logging.getLogger("minimap.gateway")

router = APIRouter()

# The ONLY routing table: Operation-Type -> internal RPC method name.
OPERATION_ROUTES: dict[OperationType, str] = {
    OperationType.HEALTH_PING: "system.ping",
    OperationType.JOURNEY_START: "journey.start",
    OperationType.JOURNEY_NEXT_DAY: "journey.next_day",
    OperationType.BUDGET_CHECK: "budget.check",
    OperationType.GEO_REACHABLE: "geo.reachable",
}


async def _read_payload(request: Request) -> dict:
    """Parse the JSON body, tolerating an empty body as ``{}``."""
    raw = await request.body()
    if not raw:
        return {}
    try:
        data = await request.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="invalid JSON body") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="body must be a JSON object")
    return data


@router.post("/api/gateway", response_model=GatewayResponse)
async def gateway(
    request: Request,
    x_operation_type: str = Header(..., alias="X-Operation-Type"),
    x_api_key: str = Header("", alias="X-Api-Key"),
) -> GatewayResponse:
    """Authenticate, resolve the operation, and dispatch via RPC."""
    # Re-bind the trace id into this handler's context so service logs emitted
    # during rpc.call carry the same id (middleware runs in a separate context).
    trace_id_var.set(getattr(request.state, "trace_id", "-"))

    if get_settings().gateway_api_key and not security.check_gateway_key(x_api_key):
        raise HTTPException(status_code=401, detail="invalid api key")

    try:
        operation = OperationType(x_operation_type)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"unknown operation: {x_operation_type}"
        ) from None

    method = OPERATION_ROUTES.get(operation)
    if method is None:
        raise HTTPException(
            status_code=400, detail=f"unrouted operation: {operation.value}"
        )

    payload = await _read_payload(request)
    logger.info("dispatch operation=%s method=%s", operation.value, method)
    await security.audit(operation.value)

    try:
        data = await rpc.call(method, payload)
    except MethodNotFound:
        raise HTTPException(
            status_code=503, detail=f"service for {operation.value} not registered"
        ) from None
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface as 400 with the message
        logger.exception("operation %s failed", operation.value)
        return GatewayResponse(ok=False, operation=operation.value, error=str(exc))

    return GatewayResponse(ok=True, operation=operation.value, data=data)
