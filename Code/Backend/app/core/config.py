"""Settings loading and lazy client singletons.

Singletons are created lazily and tolerantly: a missing GCP credential or an
unreachable MongoDB must NOT stop the app from booting, so local development
and CI can exercise gateway routing without live infrastructure.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("minimap.config")


class Settings(BaseSettings):
    """Environment-backed configuration (see .env.example for every key)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Runtime
    app_env: str = "local"
    log_level: str = "INFO"

    # Vertex AI / Gemini
    google_genai_use_vertexai: bool = True
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_application_credentials: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "minimap"

    # External APIs
    voyage_api_key: str = ""
    openweather_api_key: str = ""
    google_places_api_key: str = ""
    fx_api_key: str = ""

    # Gateway
    gateway_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings singleton."""
    return Settings()


# --- Vertex AI / Gemini client singleton -----------------------------------

_genai_client: Any | None = None


def get_genai_client() -> Any | None:
    """Return a cached google-genai client, or None if it cannot initialize.

    Returning None (instead of raising) lets the agent layer fall back to a
    stub during local development without live Vertex AI credentials.
    """
    global _genai_client
    if _genai_client is not None:
        return _genai_client

    settings = get_settings()
    try:
        from google import genai

        _genai_client = genai.Client(
            vertexai=settings.google_genai_use_vertexai,
            project=settings.google_cloud_project or None,
            location=settings.google_cloud_location or None,
        )
    except Exception as exc:  # noqa: BLE001 - tolerant boot by design
        logger.warning(
            "google-genai client unavailable (%s); agent runs in stub mode.",
            exc,
        )
        _genai_client = None
    return _genai_client


# --- MongoDB async client singleton ----------------------------------------

_mongo_client: Any | None = None


def get_mongo_client() -> Any:
    """Return the cached async Mongo client (Motor AsyncIOMotorClient).

    Construction does not open a socket, so this never blocks boot even when
    MongoDB is unreachable; failures surface on first real operation.
    """
    global _mongo_client
    if _mongo_client is None:
        from motor.motor_asyncio import AsyncIOMotorClient

        # Short server-selection timeout so a missing DB fails fast in dev
        # instead of blocking for the 30s default.
        _mongo_client = AsyncIOMotorClient(
            get_settings().mongodb_uri, serverSelectionTimeoutMS=3000
        )
    return _mongo_client


def get_db() -> Any:
    """Return the configured async (Motor) database handle."""
    return get_mongo_client()[get_settings().mongodb_db]


async def close_clients() -> None:
    """Close client singletons on shutdown."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()  # Motor's close() is synchronous
        _mongo_client = None


class MissingConfigError(RuntimeError):
    """Raised at startup when a required configuration variable is absent."""


def missing_required_settings() -> list[str]:
    """Return the names of required env vars that are unset.

    The core two are always required; the external API keys are required only
    in production so local/dev and tests can run on stubs.
    """
    settings = get_settings()
    required = {
        "GOOGLE_CLOUD_PROJECT": settings.google_cloud_project,
        "MONGODB_URI": settings.mongodb_uri,
    }
    if settings.app_env == "production":
        required["VOYAGE_API_KEY"] = settings.voyage_api_key
        required["OPENWEATHER_API_KEY"] = settings.openweather_api_key
        required["GOOGLE_PLACES_API_KEY"] = settings.google_places_api_key
        required["FX_API_KEY"] = settings.fx_api_key
    return [name for name, value in required.items() if not value]


def enforce_required_settings() -> None:
    """Fail fast (§9) when required config is missing in production."""
    missing = missing_required_settings()
    if not missing:
        return
    message = f"missing required configuration: {', '.join(missing)}"
    if get_settings().app_env == "production":
        raise MissingConfigError(message)
    logger.warning("%s (tolerated outside production)", message)
