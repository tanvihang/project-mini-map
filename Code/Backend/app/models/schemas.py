"""Strong-typed contracts mirroring docs/engineering/Data-Models.md.

Conventions (Backend-Coding-Standards §7.1):
- Python attributes are snake_case; JSON/BSON keys are camelCase via the alias
  generator. Response models serialize with by_alias=True (FastAPI default).
- Input models set ``extra="forbid"`` — untrusted LLM/API JSON is rejected at
  the boundary (§3).
- Money uses MoneyAmount/Money (integer minor units; see app/core/money.py).
- GeoJSON coordinates are ALWAYS [longitude, latitude] (§2.1).
"""

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.core.money import Money, MoneyAmount

OBJECT_ID = re.compile(r"^[a-f\d]{24}$", re.I)
UUID_V4 = re.compile(
    r"^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$",
    re.I,
)


class CamelModel(BaseModel):
    """Base for stored/response models: snake_case attrs, camelCase wire keys."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StrictInput(BaseModel):
    """Base for boundary inputs: camelCase + reject unknown fields (§3)."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )


def _validate_object_id(value: str | None) -> str | None:
    if value is not None and not (OBJECT_ID.match(value) or UUID_V4.match(value)):
        raise ValueError("invalid ObjectId")
    return value


# --- Operation contract (gateway) ------------------------------------------


class OperationType(str, Enum):
    """Values accepted in the ``X-Operation-Type`` header."""

    HEALTH_PING = "HEALTH_PING"
    USER_REGISTER = "USER_REGISTER"
    USER_LOGIN = "USER_LOGIN"
    JOURNEY_START = "JOURNEY_START"
    JOURNEY_NEXT_DAY = "JOURNEY_NEXT_DAY"
    JOURNEY_LIST = "JOURNEY_LIST"
    JOURNEY_GET = "JOURNEY_GET"
    BUDGET_CHECK = "BUDGET_CHECK"
    GEO_REACHABLE = "GEO_REACHABLE"
    CHAT_SEND = "CHAT_SEND"
    WAYPOINT_ADD = "WAYPOINT_ADD"
    WAYPOINT_REMOVE = "WAYPOINT_REMOVE"
    WAYPOINT_SUGGEST = "WAYPOINT_SUGGEST"


class GatewayResponse(BaseModel):
    """Uniform REST envelope. Carries the service's structured result in ``data``."""

    ok: bool
    operation: str
    data: Any = None
    error: str | None = None


# --- Geo --------------------------------------------------------------------


class GeoPoint(CamelModel):
    """GeoJSON Point — coordinates are [longitude, latitude]."""

    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(..., min_length=2, max_length=2)


# --- Node sub-documents (Data-Models §3) -----------------------------------


class Location(CamelModel):
    name: str
    address: str | None = None
    coordinates: GeoPoint


class Weather(CamelModel):
    condition: str | None = None
    temp_c: float | None = None
    source: str | None = None


class Senses(CamelModel):
    see: str | None = None
    hear: str | None = None
    smell: str | None = None
    taste: str | None = None
    touch: str | None = None
    mood: str | None = None
    story: str | None = None


class Dialogue(CamelModel):
    speaker: str
    language: str
    text: str
    translation: str | None = None


class LocalPhrase(CamelModel):
    phrase: str
    pronunciation: str | None = None
    meaning: str | None = None


class Culture(CamelModel):
    culture_tips: list[str] = Field(default_factory=list)
    local_phrase: LocalPhrase | None = None
    dos_donts: dict[str, list[str]] = Field(default_factory=dict)


class Practical(CamelModel):
    opening_hours: str | None = None
    crowd_level: str | None = None
    best_time_to_visit: str | None = None
    photo_tip: str | None = None
    booking_required: bool = False


class Media(CamelModel):
    reference_photos: list[str] = Field(default_factory=list)
    ambient_sound: str | None = None


PriceCategory = Literal["accommodation", "food", "transport", "entry", "other"]


class Node(CamelModel):
    """One stop in a journey (the ``nodes`` collection).

    ``embedding`` is omitted on purpose — non-vector reads MUST project it
    out (§5.1).
    """

    journey_id: str | None = None
    seeded_by_choice_id: str | None = None
    place_id: str | None = None
    day_number: int = Field(..., ge=1)
    order_in_day: int = Field(0, ge=0)
    time: str | None = None
    title: str
    location: Location
    transport: str | None = None
    weather: Weather | None = None
    price_category: PriceCategory
    price: Money
    senses: Senses
    dialogues: list[Dialogue] = Field(default_factory=list)
    culture: Culture | None = None
    practical: Practical | None = None
    media: Media | None = None
    search_tags: list[str] = Field(default_factory=list)


# --- Journey state (Data-Models §2) ----------------------------------------

JourneyStatus = Literal["ready", "generating", "active", "completed"]


class JourneyState(CamelModel):
    journey_id: str | None = None
    user_id: str
    destination: str
    total_days: int = Field(..., ge=1, le=14)
    current_day: int = Field(0, ge=0)
    budget_currency: str
    budget_exponent: int = Field(..., ge=0)
    total_budget_minor: int = Field(..., ge=0)
    remaining_budget_minor: int
    travel_style: str | None = None
    interests: list[str] = Field(default_factory=list)
    current_location: GeoPoint | None = None
    start_location: GeoPoint | None = None  # 新增: 起始位置
    start_location_name: str | None = None  # 新增: 起始位置名称
    visited_tags: list[str] = Field(default_factory=list)
    waypoints: list["Waypoint"] = Field(default_factory=list)  # 新增: 途经景点
    status: JourneyStatus = "ready"


# --- Waypoints (途经景点) ---------------------------------------------------


WaypointType = Literal["auto", "manual"]


class Waypoint(CamelModel):
    """途经景点模型"""
    name: str
    coordinates: GeoPoint
    type: WaypointType  # auto=系统推荐, manual=用户添加
    between_days: tuple[int, int] | None = None  # 在哪两天之间 (from_day, to_day)


# --- Choices (Data-Models §4) ----------------------------------------------

ChoiceType = Literal["move", "activity", "explore", "slow"]


class ChoiceOption(CamelModel):
    type: ChoiceType
    title: str
    description: str
    estimated_cost: MoneyAmount
    travel_time_from_current: str | None = None
    destination_coordinates: GeoPoint
    destination_name: str
    tags: list[str] = Field(default_factory=list)
    is_recommended: bool = False


# --- MCP tool input models (MCP-Tools.md), used by the gateway operations ---


class GetJourneyStateInput(StrictInput):
    journey_id: str

    _vid = field_validator("journey_id")(_validate_object_id)


class GetReachableLocationsInput(StrictInput):
    """Mirror of the ``get_reachable_locations`` tool inputSchema."""

    longitude: float
    latitude: float
    max_distance_meters: int = Field(200_000, gt=0)
    exclude_tags: list[str] = Field(default_factory=list)
    interest_query: str | None = None


class PriceInput(StrictInput):
    local_currency: str = Field(min_length=3, max_length=3)
    local_minor_units: str = Field(pattern=r"^\d+$")  # string -> int downstream
    fx_rate: float = Field(gt=0)


class CreateNodeLocationInput(StrictInput):
    name: str
    address: str | None = None
    coordinates: list[float] = Field(
        ..., min_length=2, max_length=2
    )  # [lon, lat]


class SensesInput(StrictInput):
    see: str
    hear: str
    smell: str
    taste: str | None = None
    touch: str | None = None
    mood: str | None = None
    story: str


class CreateNodeInput(StrictInput):
    journey_id: str
    day_number: int = Field(ge=1)
    order_in_day: int = Field(ge=0)
    time: str | None = None
    title: str = Field(min_length=1)
    seeded_by_choice_id: str | None = None
    place_id: str | None = None
    location: CreateNodeLocationInput
    transport: str | None = None
    price_category: PriceCategory
    price: PriceInput
    senses: SensesInput

    _vj = field_validator("journey_id", "seeded_by_choice_id")(
        _validate_object_id
    )


class UpdateJourneyInput(StrictInput):
    journey_id: str
    current_day: int = Field(ge=0)
    deduct_budget_minor: str = Field(pattern=r"^\d+$")
    new_location_coordinates: list[float] = Field(
        ..., min_length=2, max_length=2
    )
    append_tags: list[str] = Field(default_factory=list)

    _vj = field_validator("journey_id")(_validate_object_id)


# --- Gateway operation requests --------------------------------------------


class JourneyStartRequest(StrictInput):
    user_id: str
    destination: str
    total_days: int = Field(..., ge=1, le=14)
    total_budget_minor: str = Field(pattern=r"^\d+$")
    budget_currency: str
    travel_style: str | None = None
    interests: list[str] = Field(default_factory=list)
    start_location: list[float] | dict | None = Field(
        None, description="[lng, lat] 或 {name: string} 用于地理编码"
    )
    start_location_name: str | None = Field(
        None, description="起始地点名称"
    )


class JourneyNextDayRequest(StrictInput):
    journey_id: str
    chosen_index: int = Field(ge=0)

    _vj = field_validator("journey_id")(_validate_object_id)


class JourneyListRequest(StrictInput):
    user_id: str

    _vu = field_validator("user_id")(_validate_object_id)


class JourneyGetRequest(StrictInput):
    journey_id: str

    _vj = field_validator("journey_id")(_validate_object_id)


class BudgetCheckRequest(StrictInput):
    """Integer-only budget guard inputs (§1.6). Minor amounts arrive as strings."""

    remaining_budget_minor: str = Field(pattern=r"^\d+$")
    remaining_days: int = Field(..., ge=1)
    estimated_cost_minor: str = Field(pattern=r"^\d+$")
    currency: str = "MYR"


# --- User models ------------------------------------------------------------


class UserRegisterRequest(StrictInput):
    """Request to register a new user."""

    email: str = Field(..., min_length=1, pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    password: str = Field(..., min_length=8)
    display_name: str | None = Field(None, min_length=1, max_length=100)


class UserLoginRequest(StrictInput):
    """Request to log in an existing user."""

    email: str = Field(..., min_length=1, pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    password: str = Field(..., min_length=8)


class User(CamelModel):
    """Stored user document."""

    user_id: str
    email: str
    display_name: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Chat models ------------------------------------------------------------


class ChatMessage(CamelModel):
    """A single message in a chat conversation."""

    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(CamelModel):
    """A chat session with message history."""

    session_id: str
    journey_id: str | None = None
    messages: list[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSendRequest(StrictInput):
    """Request to send a message to the travel agent."""

    session_id: str | None = None
    journey_id: str | None = None
    message: str = Field(min_length=1)


class ChatSendResponse(CamelModel):
    """Response from the travel agent."""

    session_id: str
    reply: str
    suggested_actions: list[str] = Field(default_factory=list)


# --- Waypoint models (途经景点) ---------------------------------------------


class WaypointAddRequest(StrictInput):
    """添加途经景点请求"""
    journey_id: str
    name: str = Field(min_length=1)
    coordinates: list[float] = Field(..., min_length=2, max_length=2)
    between_days: tuple[int, int] | None = None

    _vj = field_validator("journey_id")(_validate_object_id)


class WaypointRemoveRequest(StrictInput):
    """删除途经景点请求"""
    journey_id: str
    waypoint_index: int = Field(ge=0)

    _vj = field_validator("journey_id")(_validate_object_id)


class WaypointSuggestRequest(StrictInput):
    """获取推荐途经景点请求"""
    journey_id: str
    from_day: int = Field(ge=1)
    to_day: int = Field(ge=2)

    _vj = field_validator("journey_id")(_validate_object_id)
