"""The single public gateway.

One endpoint. It reads ``X-Operation-Type``, maps it to exactly one internal
RPC method, and dispatches. Services are never imported here — the gateway only
knows operation names and the routing table.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import ValidationError

from app.core import security
from app.core.config import get_settings
from app.core.errors import ERR_INTERNAL, ERR_VALIDATION, error_contract
from app.core.logging_config import trace_id_var
from app.core.rpc import MethodNotFoundError, rpc
from app.models.schemas import GatewayResponse, OperationType

logger = logging.getLogger("minimap.gateway")

router = APIRouter()

# The ONLY routing table: Operation-Type -> internal RPC method name.
OPERATION_ROUTES: dict[OperationType, str] = {
    OperationType.HEALTH_PING: "system.ping",
    OperationType.USER_REGISTER: "user.register",
    OperationType.USER_LOGIN: "user.login",
    OperationType.JOURNEY_START: "journey.start",
    OperationType.JOURNEY_NEXT_DAY: "journey.next_day",
    OperationType.JOURNEY_LIST: "journey.list",
    OperationType.JOURNEY_GET: "journey.get",
    OperationType.BUDGET_CHECK: "budget.check",
    OperationType.GEO_REACHABLE: "geo.reachable",
    OperationType.CHAT_SEND: "chat.send",
    OperationType.WAYPOINT_ADD: "waypoint.add",
    OperationType.WAYPOINT_REMOVE: "waypoint.remove",
    OperationType.WAYPOINT_SUGGEST: "waypoint.suggest",
}


async def _read_payload(request: Request) -> dict:
    """Parse the JSON body, tolerating an empty body as ``{}``."""
    raw = await request.body()
    if not raw:
        return {}
    try:
        data = await request.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail="invalid JSON body"
        ) from exc
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=400, detail="body must be a JSON object"
        )
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

    if get_settings().gateway_api_key and not security.check_gateway_key(
        x_api_key
    ):
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
    logger.debug("recv operation=%s method=%s", operation.value, method)
    start = time.perf_counter()

    def _dur_ms() -> float:
        return (time.perf_counter() - start) * 1000.0

    try:
        data = await rpc.call(method, payload)
    except MethodNotFoundError:
        security.audit(
            operation.value,
            ok=False,
            error_code="ERR_NOT_REGISTERED",
            duration_ms=_dur_ms(),
        )
        raise HTTPException(
            status_code=503,
            detail=f"service for {operation.value} not registered",
        ) from None
    except ValidationError:
        security.audit(
            operation.value,
            ok=False,
            error_code=ERR_VALIDATION,
            duration_ms=_dur_ms(),
        )
        contract = error_contract(
            ERR_VALIDATION, "payload failed boundary validation"
        )
        return GatewayResponse(
            ok=False,
            operation=operation.value,
            data=contract,
            error=ERR_VALIDATION,
        )
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001 - never leak internals to the client
        logger.exception("operation %s failed", operation.value)
        security.audit(
            operation.value,
            ok=False,
            error_code=ERR_INTERNAL,
            duration_ms=_dur_ms(),
        )
        contract = error_contract(ERR_INTERNAL, "internal error")
        return GatewayResponse(
            ok=False,
            operation=operation.value,
            data=contract,
            error=ERR_INTERNAL,
        )

    # A service returning the structured failure contract maps to ok=False.
    if isinstance(data, dict) and data.get("isSuccess") is False:
        code = data.get("errorCode")
        security.audit(
            operation.value, ok=False, error_code=code, duration_ms=_dur_ms()
        )
        return GatewayResponse(
            ok=False,
            operation=operation.value,
            data=data,
            error=code,
        )
    security.audit(operation.value, ok=True, duration_ms=_dur_ms())
    return GatewayResponse(ok=True, operation=operation.value, data=data)
