"""Tests for AsyncBoutClient — uses respx to mock async HTTP calls."""

import pytest
import respx
import httpx
from bout import AsyncBoutClient, BoutAPIError, BoutValidationError


BASE = "https://api.alphabout.dev"

MOCK_AGENT = {
    "id": "agent-123",
    "name": "ASYNC_BOT",
    "display_name": "Async Bot",
    "creator": "@async_tester",
    "api_key": "key-async-123",
    "created_at": "2026-03-22T00:00:00",
}

MOCK_TRADE = {
    "id": "trade-789",
    "ticker": "KXNBA-CELTICS-YES",
    "side": "yes",
    "action": "buy",
    "contracts": 5,
    "price_cents": 62,
    "status": "pending",
    "reported_at": "2026-03-22T00:02:00",
    "market_title": "Celtics win?",
    "kalshi_order_id": "kalshi-order-xyz",
    "kalshi_fill_price": None,
    "verified_at": None,
    "resolution": "open",
    "pnl_cents": None,
}

MOCK_PROFILE = {
    "name": "ASYNC_BOT",
    "display_name": "Async Bot",
    "creator": "@async_tester",
    "created_at": "2026-03-22T00:00:00",
    "last_verified_at": "2026-03-22T01:00:00",
    "stats": {
        "total_trades": 10,
        "verified_trades": 8,
        "unverified_trades": 1,
        "pending_trades": 1,
        "extra_trades": 0,
        "win_rate": 72.0,
        "roi_percent": 88.3,
        "total_pnl_cents": 5000,
        "verification_rate": 0.889,
    },
}


class TestAsyncRegister:
    @respx.mock
    @pytest.mark.asyncio
    async def test_register(self):
        respx.post(f"{BASE}/agents").mock(
            return_value=httpx.Response(201, json=MOCK_AGENT)
        )
        agent = await AsyncBoutClient.register("ASYNC_BOT", "Async Bot", "@async_tester")
        assert agent.name == "ASYNC_BOT"
        assert agent.api_key == "key-async-123"


class TestAsyncReportTrade:
    @respx.mock
    @pytest.mark.asyncio
    async def test_report(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(201, json=MOCK_TRADE)
        )
        async with AsyncBoutClient(api_key="key-async-123") as client:
            trade = await client.report_trade(
                ticker="KXNBA-CELTICS-YES",
                side="yes", action="buy",
                contracts=5, kalshi_order_id="kalshi-order-xyz",
                price_cents=62,
            )
        assert trade.id == "trade-789"
        assert trade.contracts == 5
        assert trade.kalshi_order_id == "kalshi-order-xyz"

    @pytest.mark.asyncio
    async def test_validates_before_network(self):
        async with AsyncBoutClient(api_key="key-async-123") as client:
            with pytest.raises(BoutValidationError):
                await client.report_trade(
                    ticker="KXNBA-CELTICS-YES",
                    side="yes", action="buy",
                    contracts=-1, kalshi_order_id="order-1",
                )

    @respx.mock
    @pytest.mark.asyncio
    async def test_report_error(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(401, json={"detail": "Invalid API key"})
        )
        async with AsyncBoutClient(api_key="bad-key") as client:
            with pytest.raises(BoutAPIError) as exc_info:
                await client.report_trade(
                    ticker="KXNBA-CELTICS-YES",
                    side="yes", action="buy",
                    contracts=5, kalshi_order_id="order-1",
                )
        assert exc_info.value.status_code == 401


class TestAsyncProfile:
    @respx.mock
    @pytest.mark.asyncio
    async def test_get_profile(self):
        respx.get(f"{BASE}/agents/ASYNC_BOT").mock(
            return_value=httpx.Response(200, json=MOCK_PROFILE)
        )
        async with AsyncBoutClient(api_key="key-async-123") as client:
            profile = await client.profile("ASYNC_BOT")
        assert profile.stats.verified_trades == 8
        assert profile.stats.verification_rate == 0.889
        assert profile.last_verified_at is not None


class TestAsyncContextManager:
    @respx.mock
    @pytest.mark.asyncio
    async def test_async_with(self):
        respx.get(f"{BASE}/agents/ASYNC_BOT").mock(
            return_value=httpx.Response(200, json=MOCK_PROFILE)
        )
        async with AsyncBoutClient(api_key="key-async-123") as client:
            profile = await client.profile("ASYNC_BOT")
        assert profile.name == "ASYNC_BOT"
