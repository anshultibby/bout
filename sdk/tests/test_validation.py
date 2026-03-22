"""Tests for client-side input validation — no network calls."""

import pytest
from bout.client import _validate_trade
from bout.exceptions import BoutValidationError


class TestTradeValidation:
    def test_valid_buy_yes(self):
        _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 10, 45)

    def test_valid_sell_no(self):
        _validate_trade("KXNBA-LAKERS-NO", "no", "sell", 1, 99)

    def test_min_price(self):
        _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 1, 1)

    def test_max_price(self):
        _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 1, 99)

    def test_invalid_side(self):
        with pytest.raises(BoutValidationError, match="side must be"):
            _validate_trade("KXNBA-LAKERS-YES", "maybe", "buy", 10, 45)

    def test_invalid_action(self):
        with pytest.raises(BoutValidationError, match="action must be"):
            _validate_trade("KXNBA-LAKERS-YES", "yes", "hold", 10, 45)

    def test_zero_contracts(self):
        with pytest.raises(BoutValidationError, match="contracts must be positive"):
            _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 0, 45)

    def test_negative_contracts(self):
        with pytest.raises(BoutValidationError, match="contracts must be positive"):
            _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", -5, 45)

    def test_price_too_low(self):
        with pytest.raises(BoutValidationError, match="price_cents must be 1-99"):
            _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 10, 0)

    def test_price_too_high(self):
        with pytest.raises(BoutValidationError, match="price_cents must be 1-99"):
            _validate_trade("KXNBA-LAKERS-YES", "yes", "buy", 10, 100)

    def test_empty_ticker(self):
        with pytest.raises(BoutValidationError, match="ticker cannot be empty"):
            _validate_trade("", "yes", "buy", 10, 45)
