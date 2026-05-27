"""Strong-typed contracts: operations, gateway envelope, and the Node schema.

Monetary values are always integer minor units (e.g. cents) carried inside the
``Money`` type — never bare floats — so currency math stays exact.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# --- Operation contract ----------------------------------------------------


class OperationType(str, Enum):
    """The values the gateway accepts in the ``X-Operation-Type`` header.

    This enum IS the public surface: the frontend speaks these names, the
    gateway maps each to exactly one internal RPC method.
    """

    HEALTH_PING = "HEALTH_PING"
    JOURNEY_START = "JOURNEY_START"
    JOURNEY_NEXT_DAY = "JOURNEY_NEXT_DAY"
    BUDGET_CHECK = "BUDGET_CHECK"
    GEO_REACHABLE = "GEO_REACHABLE"


class GatewayResponse(BaseModel):
    """Uniform envelope returned by the single gateway endpoint."""

    ok: bool
    operation: str
    data: Any = None
    error: Optional[str] = None


# --- Money (integer minor units) -------------------------------------------


class Money(BaseModel):
    """A monetary amount in minor units of a single currency."""

    currency: str = Field(..., examples=["MYR"])
    exponent: int = Field(2, description="Number of minor-unit decimals.")
    minor_units: int = Field(..., description="Amount in minor units (e.g. cents).")


class Price(BaseModel):
    """Display + local currency pair with the FX rate used to derive display."""

    display: Money
    local: Money
    fx_rate: float
    as_of: str


# --- Node sub-documents (mirror the README node schema) --------------------


class GeoPoint(BaseModel):
    """GeoJSON Point: coordinates are [longitude, latitude]."""

    type: str = "Point"
    coordinates: list[float] = Field(..., min_length=2, max_length=2)


class Location(BaseModel):
    name: str
    address: Optional[str] = None
    coordinates: GeoPoint


class Weather(BaseModel):
    condition: Optional[str] = None
    temp_c: Optional[float] = None
    source: Optional[str] = None


class Senses(BaseModel):
    see: Optional[str] = None
    hear: Optional[str] = None
    smell: Optional[str] = None
    taste: Optional[str] = None
    touch: Optional[str] = None
    mood: Optional[str] = None
    story: Optional[str] = None


class Dialogue(BaseModel):
    speaker: str
    language: str
    text: str
    translation: Optional[str] = None


class LocalPhrase(BaseModel):
    phrase: str
    pronunciation: Optional[str] = None
    meaning: Optional[str] = None


class Culture(BaseModel):
    culture_tips: list[str] = Field(default_factory=list)
    local_phrase: Optional[LocalPhrase] = None
    dos_donts: dict[str, list[str]] = Field(default_factory=dict)


class Practical(BaseModel):
    opening_hours: Optional[str] = None
    crowd_level: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    photo_tip: Optional[str] = None
    booking_required: bool = False


class Media(BaseModel):
    reference_photos: list[str] = Field(default_factory=list)
    ambient_sound: Optional[str] = None


class Node(BaseModel):
    """One stop in a journey — a single document in the ``nodes`` collection."""

    journey_id: Optional[str] = None
    day_number: int
    order_in_day: int = 0
    time: Optional[str] = None
    title: str
    location: Location
    transport: Optional[str] = None
    weather: Optional[Weather] = None
    price_category: Optional[str] = None
    price: Optional[Price] = None
    senses: Optional[Senses] = None
    dialogues: list[Dialogue] = Field(default_factory=list)
    culture: Optional[Culture] = None
    practical: Optional[Practical] = None
    media: Optional[Media] = None
    search_tags: list[str] = Field(default_factory=list)


# --- Service request / result models ---------------------------------------


class JourneyStartRequest(BaseModel):
    destination: str
    total_days: int = Field(..., ge=1)
    total_budget: Money
    style: str
    interests: list[str] = Field(default_factory=list)


class JourneyNextDayRequest(BaseModel):
    journey_id: str
    chosen_option_id: str


class BudgetCheckRequest(BaseModel):
    """Inputs for the deterministic remaining-budget-per-day guard."""

    remaining_minor: int = Field(..., ge=0)
    remaining_days: int = Field(..., ge=1)
    option_cost_minor: int = Field(..., ge=0)
    currency: str = "MYR"


class BudgetCheckResult(BaseModel):
    approved: bool
    ceiling_minor: int
    option_cost_minor: int
    currency: str
    reason: str


class GeoReachableRequest(BaseModel):
    """Find POIs physically reachable from a point (GeoJSON [lng, lat])."""

    lng: float
    lat: float
    max_km: float = Field(200.0, gt=0)
    limit: int = Field(20, ge=1, le=100)
