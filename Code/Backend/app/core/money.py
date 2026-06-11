"""Money Handling Law (Backend-Coding-Standards §1).

Money is NEVER a float/Decimal. Every amount is an integer count of the
currency's minor unit; all arithmetic is integer. On the JSON wire, ``minorUnits``
and ``major`` are emitted as decimal strings (JS clients are unsafe > 2**53);
``exponent`` stays a number. Python attributes are snake_case, JSON/BSON keys are
camelCase (bridged by the alias generator).
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_serializer
from pydantic.alias_generators import to_camel


class UnknownCurrencyError(Exception):
    """Raised when a currency has no entry in the ISO 4217 exponent map."""

    def __init__(self, currency: str) -> None:
        super().__init__(f"unknown currency: {currency}")
        self.currency = currency


# §1.3 — exponent MUST come from ISO 4217, never hardcoded.
ISO_4217_EXPONENT: dict[str, int] = {
    "MYR": 2,
    "USD": 2,
    "EUR": 2,
    "GBP": 2,
    "NPR": 2,
    "THB": 2,
    "IDR": 2,
    "SGD": 2,
    "INR": 2,
    "PHP": 2,
    "CNY": 2,
    "AUD": 2,
    "JPY": 0,
    "KRW": 0,
    "VND": 0,
    "BHD": 3,
    "KWD": 3,
    "OMR": 3,
    # Team to confirm: extend to the full supported currency set.
}


def exponent_of(currency: str) -> int:
    """Return the minor-unit digit count for ``currency`` (ISO 4217)."""
    try:
        return ISO_4217_EXPONENT[currency]
    except KeyError as exc:
        raise UnknownCurrencyError(currency) from exc


class MoneyAmount(BaseModel):
    """A single-currency amount. ``minor_units`` is the authoritative integer."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    currency: str
    exponent: int
    minor_units: int
    major: int
    minor: str

    @field_serializer("minor_units", "major", when_used="json")
    def _ints_as_strings(self, value: int) -> str:
        # JSON wire only: big integers as strings. BSON/python dumps keep int.
        return str(value)


class Money(BaseModel):
    """A captured dual-currency price: display + local + the one-time FX rate."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    display: MoneyAmount
    local: MoneyAmount
    fx_rate: float
    as_of: str | None = None


def to_money_amount(minor_units: int | str, currency: str) -> MoneyAmount:
    """Build a :class:`MoneyAmount` from minor units. The only sanctioned builder.

    Accepts an int or a decimal string (rejects floats/garbage via ``int()``).
    Amounts are assumed non-negative in the MVP (no refunds).
    """
    exponent = exponent_of(currency)
    value = int(minor_units)
    factor = 10**exponent
    minor = "" if exponent == 0 else str(value % factor).zfill(exponent)
    return MoneyAmount(
        currency=currency,
        exponent=exponent,
        minor_units=value,
        major=value // factor,
        minor=minor,
    )


def convert_local_to_display(
    local_minor_units: int | str, fx_rate: float
) -> int:
    """FX touches money exactly once (§1.5): round to integer display minor units."""
    return round(int(local_minor_units) * fx_rate)
