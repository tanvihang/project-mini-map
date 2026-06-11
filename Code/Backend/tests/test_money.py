"""Money Handling Law tests (Backend-Coding-Standards §1)."""

from __future__ import annotations

import pytest

from app.core.money import (
    UnknownCurrencyError,
    exponent_of,
    to_money_amount,
)


def test_to_money_amount_two_decimal_currency():
    money = to_money_amount(4400, "MYR")
    assert money.exponent == 2
    assert money.minor_units == 4400
    assert money.major == 44
    assert money.minor == "00"


def test_to_money_amount_zero_decimal_currency():
    money = to_money_amount(1000, "JPY")
    assert money.exponent == 0
    assert money.major == 1000
    assert money.minor == ""


def test_to_money_amount_accepts_string_minor_units():
    money = to_money_amount("80000", "NPR")
    assert money.minor_units == 80000
    assert money.major == 800


def test_minor_units_and_major_serialize_as_strings_on_json_wire():
    money = to_money_amount(4400, "MYR")
    wire = money.model_dump(mode="json", by_alias=True)
    assert wire["minorUnits"] == "4400"  # string for JS-safe big ints
    assert wire["major"] == "44"
    assert wire["exponent"] == 2  # exponent stays a number
    assert "minor_units" not in wire  # camelCase keys only


def test_python_dump_keeps_ints_for_bson():
    money = to_money_amount(4400, "MYR")
    native = money.model_dump(by_alias=True)
    assert native["minorUnits"] == 4400
    assert isinstance(native["minorUnits"], int)


def test_exponent_must_come_from_iso_map():
    assert exponent_of("BHD") == 3
    with pytest.raises(UnknownCurrencyError):
        exponent_of("ZZZ")
