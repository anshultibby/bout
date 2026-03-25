"""Tests for sync BoutClient — uses respx to mock HTTP calls."""

import pytest
import respx
import httpx
from bout import BoutClient, BoutAPIError, BoutValidationError


BASE = "https://api.alphaalphabout.dev"

MOCK_AGENT = {
    "id": "agent-123",
    "name": "TEST_BOT",
    "display_name": "Test Bot",
    "creator": "@tester",
    "api_key": "key-abc-123",
    "kalshi_connected": False,
    "created_at": "2026-03-22T00:00:00",
}

MOCK_TRADE = {
    "id": "trade-456",
    "ticker": "KXNBA-LAKERS-YES",
    "side": "yes",
    "action": "buy",
    "contracts": 10,
    "price_cents": 45,
    "status": "pending",
    "reported_at": "2026-03-22T00:01:00",
    "market_title": "Lakers win?",
    "kalshi_order_id": None,
    "kalshi_fill_price": None,
    "verified_at": None,
}

MOCK_PROFILE = {
    "name": "TEST_BOT",
    "display_name": "Test Bot",
    "creator": "@tester",
    "created_at": "2026-03-22T00:00:00",
    "last_verified_at": None,
    "stats": {
        "total_trades": 5,
        "verified_trades": 3,
        "unverified_trades": 1,
        "pending_trades": 1,
        "extra_trades": 0,
        "win_rate": 66.7,
        "roi_percent": 42.5,
        "total_pnl_cents": 1500,
        "verification_rate": 0.75,
    },
}

MOCK_VERIFY = {
    "agent_name": "TEST_BOT",
    "total_checked": 2,
    "verified": 1,
    "unverified": 1,
    "extra_found": 0,
    "details": [
        {
            "trade_id": "trade-1",
            "status": "verified",
            "kalshi_order_id": "kalshi-order-1",
            "kalshi_fill_price": 45,
            "kalshi_fill_count": 10,
            "message": "Matched Kalshi fill",
        },
        {
            "trade_id": "trade-2",
            "status": "unverified",
            "kalshi_order_id": None,
            "kalshi_fill_price": None,
            "kalshi_fill_count": None,
            "message": "No matching Kalshi fill found",
        },
    ],
}

MOCK_BADGE = {
    "agent_name": "TEST_BOT",
    "verified_trades": 3,
    "win_rate": 66.7,
    "roi_percent": 42.5,
    "verification_rate": 0.75,
    "badge_svg_url": "https://api.alphaalphabout.dev/agents/TEST_BOT/badge.svg",
    "profile_url": "https://alphabout.dev/TEST_BOT",
}


class TestRegister:
    @respx.mock
    def test_register_success(self):
        respx.post(f"{BASE}/agents").mock(
            return_value=httpx.Response(201, json=MOCK_AGENT)
        )
        agent = BoutClient.register("TEST_BOT", "Test Bot", "@tester")
        assert agent.name == "TEST_BOT"
        assert agent.api_key == "key-abc-123"
        assert agent.creator == "@tester"

    @respx.mock
    def test_register_duplicate(self):
        respx.post(f"{BASE}/agents").mock(
            return_value=httpx.Response(409, json={"detail": "Agent name 'TEST_BOT' is already taken"})
        )
        with pytest.raises(BoutAPIError) as exc_info:
            BoutClient.register("TEST_BOT", "Test Bot", "@tester")
        assert exc_info.value.status_code == 409


class TestReportTrade:
    @respx.mock
    def test_report_success(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(201, json=MOCK_TRADE)
        )
        with BoutClient(api_key="key-abc-123") as client:
            trade = client.report_trade(
                ticker="KXNBA-LAKERS-YES",
                side="yes",
                action="buy",
                contracts=10,
                price_cents=45,
                market_title="Lakers win?",
            )
        assert trade.id == "trade-456"
        assert trade.status == "pending"
        assert trade.contracts == 10
        assert trade.price_cents == 45

    def test_report_validates_before_network(self):
        """Should raise BoutValidationError without making any HTTP call."""
        with BoutClient(api_key="key-abc-123") as client:
            with pytest.raises(BoutValidationError):
                client.report_trade(
                    ticker="KXNBA-LAKERS-YES",
                    side="yes",
                    action="buy",
                    contracts=10,
                    price_cents=0,  # invalid
                )

    @respx.mock
    def test_report_with_notes(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(201, json=MOCK_TRADE)
        )
        with BoutClient(api_key="key-abc-123") as client:
            trade = client.report_trade(
                ticker="KXNBA-LAKERS-YES",
                side="yes",
                action="buy",
                contracts=10,
                price_cents=45,
                notes="High conviction play",
            )
        assert trade.ticker == "KXNBA-LAKERS-YES"
        # Verify notes was sent in the request body
        request = respx.calls.last.request
        assert b"notes" in request.content

    @respx.mock
    def test_report_unauthorized(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(401, json={"detail": "Invalid API key"})
        )
        with BoutClient(api_key="bad-key") as client:
            with pytest.raises(BoutAPIError) as exc_info:
                client.report_trade(
                    ticker="KXNBA-LAKERS-YES",
                    side="yes", action="buy",
                    contracts=10, price_cents=45,
                )
        assert exc_info.value.status_code == 401

    @respx.mock
    def test_report_duplicate(self):
        respx.post(f"{BASE}/trades").mock(
            return_value=httpx.Response(409, json={"detail": "Duplicate trade"})
        )
        with BoutClient(api_key="key-abc-123") as client:
            with pytest.raises(BoutAPIError) as exc_info:
                client.report_trade(
                    ticker="KXNBA-LAKERS-YES",
                    side="yes", action="buy",
                    contracts=10, price_cents=45,
                )
        assert exc_info.value.status_code == 409


class TestProfile:
    @respx.mock
    def test_get_profile(self):
        respx.get(f"{BASE}/agents/TEST_BOT").mock(
            return_value=httpx.Response(200, json=MOCK_PROFILE)
        )
        with BoutClient(api_key="key-abc-123") as client:
            profile = client.profile("TEST_BOT")
        assert profile.name == "TEST_BOT"
        assert profile.stats.verified_trades == 3
        assert profile.stats.roi_percent == 42.5
        assert profile.stats.verification_rate == 0.75

    @respx.mock
    def test_profile_not_found(self):
        respx.get(f"{BASE}/agents/GHOST").mock(
            return_value=httpx.Response(404, json={"detail": "Agent not found"})
        )
        with BoutClient(api_key="key-abc-123") as client:
            with pytest.raises(BoutAPIError) as exc_info:
                client.profile("GHOST")
        assert exc_info.value.status_code == 404


class TestListTrades:
    @respx.mock
    def test_list_all(self):
        respx.get(f"{BASE}/trades").mock(
            return_value=httpx.Response(200, json=[MOCK_TRADE, MOCK_TRADE])
        )
        with BoutClient(api_key="key-abc-123") as client:
            trades = client.list_trades()
        assert len(trades) == 2
        assert all(t.ticker == "KXNBA-LAKERS-YES" for t in trades)

    @respx.mock
    def test_list_filtered(self):
        respx.get(f"{BASE}/trades").mock(
            return_value=httpx.Response(200, json=[MOCK_TRADE])
        )
        with BoutClient(api_key="key-abc-123") as client:
            trades = client.list_trades(agent_name="TEST_BOT", status="pending")
        assert len(trades) == 1
        # Verify query params were sent
        request = respx.calls.last.request
        assert "agent_name=TEST_BOT" in str(request.url)
        assert "status=pending" in str(request.url)


class TestVerify:
    @respx.mock
    def test_verify_trades(self):
        respx.post(f"{BASE}/agents/TEST_BOT/verify").mock(
            return_value=httpx.Response(200, json=MOCK_VERIFY)
        )
        with BoutClient(api_key="key-abc-123") as client:
            result = client.verify("TEST_BOT")
        assert result.verified == 1
        assert result.unverified == 1
        assert len(result.details) == 2
        assert result.details[0].status == "verified"
        assert result.details[0].kalshi_order_id == "kalshi-order-1"
        assert result.details[1].status == "unverified"


class TestBadge:
    @respx.mock
    def test_badge_info(self):
        respx.get(f"{BASE}/agents/TEST_BOT/badge").mock(
            return_value=httpx.Response(200, json=MOCK_BADGE)
        )
        with BoutClient(api_key="key-abc-123") as client:
            badge = client.badge("TEST_BOT")
        assert badge.verified_trades == 3
        assert badge.roi_percent == 42.5
        assert "badge.svg" in badge.badge_svg_url

    @respx.mock
    def test_badge_svg(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg">...</svg>'
        respx.get(f"{BASE}/agents/TEST_BOT/badge.svg").mock(
            return_value=httpx.Response(200, text=svg, headers={"content-type": "image/svg+xml"})
        )
        with BoutClient(api_key="key-abc-123") as client:
            result = client.badge_svg("TEST_BOT")
        assert result.startswith("<svg")


class TestLeaderboard:
    @respx.mock
    def test_leaderboard(self):
        respx.get(f"{BASE}/leaderboard").mock(
            return_value=httpx.Response(200, json=[MOCK_PROFILE])
        )
        with BoutClient(api_key="key-abc-123") as client:
            board = client.leaderboard()
        assert len(board) == 1
        assert board[0].name == "TEST_BOT"
        assert board[0].stats.verified_trades == 3


class TestContextManager:
    @respx.mock
    def test_with_statement(self):
        respx.get(f"{BASE}/agents/TEST_BOT").mock(
            return_value=httpx.Response(200, json=MOCK_PROFILE)
        )
        with BoutClient(api_key="key-abc-123") as client:
            profile = client.profile("TEST_BOT")
        assert profile.name == "TEST_BOT"
