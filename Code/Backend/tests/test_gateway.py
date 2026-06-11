"""Gateway dispatch and boundary tests (sync, via TestClient).

Using TestClient as a context manager runs the app lifespan, which registers
the services exactly as production does.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health_ping_routes_to_system():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway", headers={"X-Operation-Type": "HEALTH_PING"}, json={}
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["operation"] == "HEALTH_PING"
    assert body["data"]["pong"] is True


def test_budget_check_blocks_over_ceiling():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway",
            headers={"X-Operation-Type": "BUDGET_CHECK"},
            json={
                "remainingBudgetMinor": "100000",
                "remainingDays": 5,
                "estimatedCostMinor": "40000",
                "currency": "MYR",
            },
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is False
    assert body["error"] == "ERR_BUDGET_EXHAUSTED"
    assert body["data"]["isSuccess"] is False
    assert body["data"]["thresholdMinor"] == "30000"  # 100000*3//(5*2)


def test_budget_check_approves_within_ceiling():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway",
            headers={"X-Operation-Type": "BUDGET_CHECK"},
            json={
                "remainingBudgetMinor": "100000",
                "remainingDays": 5,
                "estimatedCostMinor": "25000",
                "currency": "MYR",
            },
        )
    body = resp.json()
    assert body["ok"] is True
    assert body["data"]["approved"] is True
    assert body["data"]["thresholdMinor"] == "30000"


def test_invalid_payload_maps_to_err_validation():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway",
            headers={"X-Operation-Type": "BUDGET_CHECK"},
            json={"remainingDays": 5},  # missing required minor fields
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is False
    assert body["error"] == "ERR_VALIDATION"


def test_unknown_operation_is_400():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway",
            headers={"X-Operation-Type": "NOT_A_REAL_OP"},
            json={},
        )
    assert resp.status_code == 400


def test_missing_operation_header_is_422():
    with TestClient(app) as client:
        resp = client.post("/api/gateway", json={})
    assert resp.status_code == 422


def test_empty_body_is_tolerated():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway", headers={"X-Operation-Type": "HEALTH_PING"}
        )
    assert resp.status_code == 200


def test_trace_id_returned_and_unique():
    with TestClient(app) as client:
        r1 = client.post(
            "/api/gateway", headers={"X-Operation-Type": "HEALTH_PING"}
        )
        r2 = client.post(
            "/api/gateway", headers={"X-Operation-Type": "HEALTH_PING"}
        )
    assert r1.headers.get("X-Trace-Id")
    assert r2.headers.get("X-Trace-Id")
    assert r1.headers["X-Trace-Id"] != r2.headers["X-Trace-Id"]


def test_inbound_trace_id_is_honoured():
    with TestClient(app) as client:
        resp = client.post(
            "/api/gateway",
            headers={"X-Operation-Type": "HEALTH_PING", "X-Trace-Id": "abc123"},
        )
    assert resp.headers["X-Trace-Id"] == "abc123"
