"""Settings loading and lazy client singletons.

Singletons are created lazily and tolerantly: a missing GCP credential or an
unreachable MongoDB must NOT stop the app from booting, so local development
and CI can exercise gateway routing without live infrastructure.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Optional

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

_genai_client: Optional[Any] = None


def get_genai_client() -> Optional[Any]:
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

_mongo_client: Optional[Any] = None


def get_mongo_client() -> Any:
    """Return the cached async Mongo client (PyMongo AsyncMongoClient).

    Construction does not open a socket, so this never blocks boot even when
    MongoDB is unreachable; failures surface on first real operation.
    """
    global _mongo_client
    if _mongo_client is None:
        from pymongo import AsyncMongoClient

        # Short server-selection timeout so a missing DB fails fast in dev
        # instead of blocking for the 30s default.
        _mongo_client = AsyncMongoClient(
            get_settings().mongodb_uri, serverSelectionTimeoutMS=3000
        )
    return _mongo_client


def get_db() -> Any:
    """Return the configured async database handle."""
    return get_mongo_client()[get_settings().mongodb_db]


async def close_clients() -> None:
    """Close client singletons on shutdown."""
    global _mongo_client
    if _mongo_client is not None:
        await _mongo_client.close()
        _mongo_client = None
