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
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.core.money import Money, MoneyAmount

OBJECT_ID = re.compile(r"^[a-f\d]{24}$", re.I)


class CamelModel(BaseModel):
    """Base for stored/response models: snake_case attrs, camelCase wire keys."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StrictInput(BaseModel):
    """Base for boundary inputs: camelCase + reject unknown fields (§3)."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )


def _validate_object_id(value: str | None) -> str | None:
    if value is not None and not OBJECT_ID.match(value):
        raise ValueError("invalid ObjectId")
    return value


# --- Operation contract (gateway) ------------------------------------------


class OperationType(str, Enum):
    """Values accepted in the ``X-Operation-Type`` header."""

    HEALTH_PING = "HEALTH_PING"
    JOURNEY_START = "JOURNEY_START"
    JOURNEY_NEXT_DAY = "JOURNEY_NEXT_DAY"
    BUDGET_CHECK = "BUDGET_CHECK"
    GEO_REACHABLE = "GEO_REACHABLE"


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
    visited_tags: list[str] = Field(default_factory=list)
    status: JourneyStatus = "ready"


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


class JourneyNextDayRequest(StrictInput):
    journey_id: str
    chosen_index: int = Field(ge=0)

    _vj = field_validator("journey_id")(_validate_object_id)


class BudgetCheckRequest(StrictInput):
    """Integer-only budget guard inputs (§1.6). Minor amounts arrive as strings."""

    remaining_budget_minor: str = Field(pattern=r"^\d+$")
    remaining_days: int = Field(..., ge=1)
    estimated_cost_minor: str = Field(pattern=r"^\d+$")
    currency: str = "MYR"
