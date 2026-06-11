"""User registration and authentication RPC implementation.

Provides user registration with MongoDB storage. Passwords are hashed using
bcrypt before storage. Email uniqueness is enforced at the database level.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

from app.core.config import get_db
from app.core.errors import (
    ERR_AUTH_FAILED,
    ERR_EMAIL_EXISTS,
    ERR_INTERNAL,
    ERR_REGISTRATION_FAILED,
    ERR_VALIDATION,
    error_contract,
    success,
)
from app.core.rpc import RpcRegistry
from app.models.schemas import UserLoginRequest, UserRegisterRequest

logger = logging.getLogger("minimap.user")


def _hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    import bcrypt

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    # bcrypt 4.1+ returns str, older versions return bytes
    return hashed if isinstance(hashed, str) else hashed.decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    """Verify password against hashed version."""
    import bcrypt

    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


async def register(payload: dict) -> dict:
    """Register a new user.

    Creates a new user document in MongoDB with hashed password.
    Returns the user_id on success, or an error contract on failure.
    """
    try:
        req = UserRegisterRequest(**payload)
    except Exception as exc:  # Pydantic validation error
        logger.warning("invalid registration payload: %s", exc)
        return error_contract(ERR_VALIDATION, str(exc))

    db = get_db()
    users_collection = db.users

    # Check if email already exists
    try:
        existing = await users_collection.find_one({"email": req.email})
        if existing:
            return error_contract(
                ERR_EMAIL_EXISTS,
                f"Email {req.email} is already registered",
                "TRY_DIFFERENT_EMAIL",
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("database lookup failed: %s", exc)
        return error_contract(ERR_INTERNAL, "Database lookup failed")

    # Create user document
    user_id = str(uuid4())
    hashed_password = _hash_password(req.password)

    user_doc = {
        "userId": user_id,
        "email": req.email,
        "passwordHash": hashed_password,
        "displayName": req.display_name,
        "createdAt": datetime.utcnow(),
    }

    try:
        await users_collection.insert_one(user_doc)
        logger.info("registered new user: %s", user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("user insert failed: %s", exc)
        return error_contract(ERR_REGISTRATION_FAILED, "Failed to create user")

    return success(
        userId=user_id,
        email=req.email,
        displayName=req.display_name,
        createdAt=user_doc["createdAt"].isoformat(),
    )


async def login(payload: dict) -> dict:
    """Authenticate a user and return their profile."""
    try:
        req = UserLoginRequest(**payload)
    except Exception as exc:  # Pydantic validation error
        logger.warning("invalid login payload: %s", exc)
        return error_contract(ERR_VALIDATION, str(exc))

    db = get_db()
    users_collection = db.users

    try:
        user = await users_collection.find_one({"email": req.email})
    except Exception as exc:  # noqa: BLE001
        logger.warning("database lookup failed: %s", exc)
        return error_contract(ERR_REGISTRATION_FAILED, "Database lookup failed")

    if not user or not _verify_password(req.password, user.get("passwordHash", "")):
        return error_contract(ERR_AUTH_FAILED, "Invalid email or password")

    return success(
        userId=user.get("userId"),
        email=user.get("email"),
        displayName=user.get("displayName"),
        createdAt=(user.get("createdAt") or datetime.utcnow()).isoformat(),
    )


def register_rpc(rpc: RpcRegistry) -> None:
    """Register user service RPC methods."""
    rpc.register("user.register", register)
    rpc.register("user.login", login)