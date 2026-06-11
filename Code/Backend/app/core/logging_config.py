"""Structured logging with a request-scoped TraceID and per-service files.

Every log line is formatted as:

    [yyyy-mm-dd hh:mm:ss] [traceid] [LEVEL] - [module]: message

Time is UTC (+00, 24-hour). The TraceID is carried in a ContextVar so it
appears on every line emitted while handling one request — including logs from
the services invoked over RPC — which makes `grep <traceid>` across the
per-service log folders enough to reconstruct a single request end-to-end.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict
from contextvars import ContextVar
from pathlib import Path

# Request-scoped trace id. Default "-" for logs emitted outside a request.
trace_id_var: ContextVar[str] = ContextVar("trace_id", default="-")

# Code/Backend/logs
LOG_DIR = Path(__file__).resolve().parents[2] / "logs"

# Logger name -> its own service log folder. Folders are never mixed, so each
# service (and the gateway) owns an isolated directory you can grep.
_SERVICE_FOLDERS: dict[str, str] = {
    "minimap.system": "gateway",  # app lifecycle / startup / unhandled errors
    "minimap.gateway": "gateway",
    "minimap.security": "gateway",
    "minimap.config": "gateway",
    "minimap.audit": "gateway",
    "minimap.journey": "journey",
    "minimap.agent": "journey",
    "minimap.budget": "budget",
    "minimap.geo": "geo_mcp",
}

# Third-party loggers re-pointed through the shared console handler so EVERY
# component (the ASGI server, the MCP framework) logs in the same format with
# the same trace-id field — no second format anywhere.
_EXTERNAL_LOGGERS = (
    "uvicorn",
    "uvicorn.error",
    "uvicorn.access",
    "fastmcp",
    "mcp",
)

_LOG_FORMAT = (
    "[%(asctime)s] [%(trace_id)s] [%(levelname)s] - [%(name)s]: %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def new_trace_id() -> str:
    """Return a globally unique trace id."""
    return uuid.uuid4().hex


class _TraceIdFilter(logging.Filter):
    """Inject the current trace id onto every record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = trace_id_var.get()
        return True


class _UtcFormatter(logging.Formatter):
    """Formatter that renders timestamps in UTC (+00)."""

    converter = time.gmtime

    def __init__(self) -> None:
        super().__init__(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)


def configure_logging(level: str = "INFO") -> None:
    """Install console + per-service file handlers. Idempotent."""
    global _configured
    if _configured:
        return

    # Map Python's level names onto the required vocabulary.
    logging.addLevelName(logging.WARNING, "WARN")
    logging.addLevelName(logging.CRITICAL, "FATAL")

    formatter = _UtcFormatter()
    trace_filter = _TraceIdFilter()

    root = logging.getLogger()
    root.setLevel(level)
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    console.addFilter(trace_filter)
    root.handlers = [console]

    # One shared file handler per folder, attached to every logger that maps
    # to it (so e.g. security/config/audit all land in gateway/gateway.log).
    folder_to_loggers: dict[str, list[str]] = defaultdict(list)
    for logger_name, folder in _SERVICE_FOLDERS.items():
        folder_to_loggers[folder].append(logger_name)

    for folder, logger_names in folder_to_loggers.items():
        folder_path = LOG_DIR / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(
            folder_path / f"{folder}.log", encoding="utf-8"
        )
        handler.setFormatter(formatter)
        handler.addFilter(trace_filter)
        for logger_name in logger_names:
            svc_logger = logging.getLogger(logger_name)
            svc_logger.setLevel(level)
            svc_logger.addHandler(handler)
            svc_logger.propagate = True  # also surface on the console

    # Strip third-party handlers and let them propagate to our root console,
    # so their lines use the one shared formatter + trace filter.
    for name in _EXTERNAL_LOGGERS:
        ext = logging.getLogger(name)
        ext.handlers = []
        ext.propagate = True
        ext.setLevel(level)

    _configured = True
