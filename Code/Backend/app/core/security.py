"""Security: GCP/ADC connectivity checks, gateway auth, and audit logging."""

from __future__ import annotations

import hmac
import logging

from app.core.config import get_settings

logger = logging.getLogger("minimap.security")
audit_logger = logging.getLogger("minimap.audit")


def verify_gcp_credentials() -> dict:
    """Probe Application Default Credentials without making a billable call.

    Returns a status dict instead of raising so a missing credential degrades
    to stub mode rather than crashing boot.
    """
    try:
        import google.auth

        _creds, project = google.auth.default()
        return {"ok": True, "project": project}
    except Exception as exc:  # noqa: BLE001 - report, don't crash
        return {"ok": False, "error": str(exc)}


def check_gateway_key(provided: str) -> bool:
    """Constant-time comparison of the caller's key against the configured one.

    When ``GATEWAY_API_KEY`` is blank the check is disabled (local dev).
    """
    expected = get_settings().gateway_api_key
    if not expected:
        return True
    return hmac.compare_digest(provided or "", expected)


async def audit(operation: str, actor: str = "anonymous", **detail) -> None:
    """Emit a structured audit line for one gateway operation."""
    audit_logger.info("op=%s actor=%s detail=%s", operation, actor, detail)
