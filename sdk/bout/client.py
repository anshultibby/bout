"""Bout SDK — sync and async clients for the Bout trade verification API."""

from __future__ import annotations
from typing import Optional, List

import httpx

from bout.exceptions import BoutAPIError, BoutValidationError
from bout.types import Agent, Trade, AgentProfile, VerifyResult, TradeVerification, AgentStats, Badge

DEFAULT_BASE_URL = "https://api.alphabout.dev"
VALID_SIDES = ("yes", "no")
VALID_ACTIONS = ("buy", "sell")


def _parse_response(resp: httpx.Response) -> dict:
    """Parse response, raising BoutAPIError on non-2xx."""
    if resp.status_code >= 400:
        try:
            detail = resp.json().get("detail", resp.text)
        except Exception:
            detail = resp.text
        raise BoutAPIError(resp.status_code, detail)
    return resp.json()


def _validate_trade(ticker: str, side: str, action: str, contracts: int, kalshi_order_id: str, price_cents: Optional[int] = None) -> None:
    """Validate trade inputs before sending to API."""
    if not ticker:
        raise BoutValidationError("ticker cannot be empty")
    if side not in VALID_SIDES:
        raise BoutValidationError(f"side must be 'yes' or 'no', got '{side}'")
    if action not in VALID_ACTIONS:
        raise BoutValidationError(f"action must be 'buy' or 'sell', got '{action}'")
    if contracts <= 0:
        raise BoutValidationError(f"contracts must be positive, got {contracts}")
    if not kalshi_order_id:
        raise BoutValidationError("kalshi_order_id is required")
    if price_cents is not None and not (1 <= price_cents <= 99):
        raise BoutValidationError(f"price_cents must be 1-99, got {price_cents}")


def _build_agent(data: dict) -> Agent:
    return Agent(
        id=data["id"],
        name=data["name"],
        display_name=data["display_name"],
        creator=data["creator"],
        api_key=data.get("api_key", ""),
        created_at=data["created_at"],
    )


def _build_trade(data: dict) -> Trade:
    return Trade(
        id=data["id"],
        ticker=data["ticker"],
        side=data["side"],
        action=data["action"],
        contracts=data["contracts"],
        price_cents=data.get("price_cents"),
        status=data["status"],
        reported_at=data["reported_at"],
        market_title=data.get("market_title"),
        kalshi_order_id=data.get("kalshi_order_id"),
        kalshi_fill_price=data.get("kalshi_fill_price"),
        verified_at=data.get("verified_at"),
        resolution=data.get("resolution"),
        pnl_cents=data.get("pnl_cents"),
    )


def _build_stats(data: dict) -> AgentStats:
    return AgentStats(
        total_trades=data["total_trades"],
        verified_trades=data["verified_trades"],
        unverified_trades=data["unverified_trades"],
        pending_trades=data["pending_trades"],
        extra_trades=data["extra_trades"],
        win_rate=data.get("win_rate"),
        roi_percent=data.get("roi_percent"),
        total_pnl_cents=data["total_pnl_cents"],
        verification_rate=data["verification_rate"],
    )


def _build_profile(data: dict) -> AgentProfile:
    return AgentProfile(
        name=data["name"],
        display_name=data["display_name"],
        creator=data["creator"],
        created_at=data["created_at"],
        last_verified_at=data.get("last_verified_at"),
        stats=_build_stats(data["stats"]),
    )


def _build_verify_result(data: dict) -> VerifyResult:
    return VerifyResult(
        agent_name=data["agent_name"],
        total_checked=data["total_checked"],
        verified=data["verified"],
        unverified=data["unverified"],
        extra_found=data["extra_found"],
        details=[
            TradeVerification(
                trade_id=d["trade_id"],
                status=d["status"],
                kalshi_order_id=d.get("kalshi_order_id"),
                kalshi_fill_price=d.get("kalshi_fill_price"),
                kalshi_fill_count=d.get("kalshi_fill_count"),
                message=d["message"],
            )
            for d in data["details"]
        ],
    )


def _build_badge(data: dict) -> Badge:
    return Badge(
        agent_name=data["agent_name"],
        verified_trades=data["verified_trades"],
        win_rate=data.get("win_rate"),
        roi_percent=data.get("roi_percent"),
        verification_rate=data["verification_rate"],
        badge_svg_url=data["badge_svg_url"],
        profile_url=data["profile_url"],
    )


class BoutClient:
    """Synchronous Bout API client.

    Usage:
        from bout import BoutClient

        client = BoutClient(api_key="your-bout-api-key")
        client.report_trade(
            ticker="KXNBA-26MAR22-LAKERS-YES",
            side="yes", action="buy",
            contracts=10, price_cents=45,
        )
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ):
        self.api_key = api_key
        self._http = httpx.Client(
            base_url=base_url,
            timeout=timeout,
            headers={"x-bout-api-key": api_key},
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ─── Agent ───

    @staticmethod
    def register(
        name: str,
        display_name: str,
        creator: str,
        base_url: str = DEFAULT_BASE_URL,
    ) -> Agent:
        """Register a new agent. Returns the agent with its API key."""
        resp = httpx.post(
            f"{base_url}/agents",
            json={"name": name, "display_name": display_name, "creator": creator},
        )
        return _build_agent(_parse_response(resp))

    def profile(self, agent_name: Optional[str] = None) -> AgentProfile:
        """Get a public agent profile with verified stats."""
        name = agent_name or self._agent_name()
        resp = self._http.get(f"/agents/{name}")
        return _build_profile(_parse_response(resp))

    # ─── Trades ───

    def report_trade(
        self,
        ticker: str,
        side: str,
        action: str,
        contracts: int,
        kalshi_order_id: str,
        price_cents: Optional[int] = None,
        market_title: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Trade:
        """Report a trade your bot just made on Kalshi.

        Args:
            kalshi_order_id: Required. The Kalshi order ID for exact verification.
            price_cents: Optional. Bout will use the actual fill price from Kalshi during verification.
        """
        _validate_trade(ticker, side, action, contracts, kalshi_order_id, price_cents)
        body: dict = {
            "ticker": ticker,
            "side": side,
            "action": action,
            "contracts": contracts,
            "kalshi_order_id": kalshi_order_id,
        }
        if price_cents is not None:
            body["price_cents"] = price_cents
        if market_title:
            body["market_title"] = market_title
        if notes:
            body["notes"] = notes
        resp = self._http.post("/trades", json=body)
        return _build_trade(_parse_response(resp))

    def report_trades(
        self,
        trades: List[dict],
    ) -> List[Trade]:
        """Report multiple trades at once (up to 100).

        Each dict should have: ticker, side, action, contracts, kalshi_order_id,
        and optionally price_cents, market_title, notes.
        """
        resp = self._http.post("/trades/batch", json={"trades": trades})
        return [_build_trade(t) for t in _parse_response(resp)]

    def list_trades(
        self,
        agent_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[Trade]:
        """List trades for an agent."""
        params: dict = {"limit": limit}
        if agent_name:
            params["agent_name"] = agent_name
        if status:
            params["status"] = status
        resp = self._http.get("/trades", params=params)
        return [_build_trade(t) for t in _parse_response(resp)]

    # ─── Verification ───

    def verify(self, agent_name: str) -> VerifyResult:
        """Verify all pending trades against Kalshi's API."""
        resp = self._http.post(f"/agents/{agent_name}/verify")
        return _build_verify_result(_parse_response(resp))

    # ─── Settlement ───

    def settle(self, agent_name: str) -> dict:
        """Settle open trades — checks public market data and matches sell trades.

        No Kalshi credentials needed. Call after a market resolves or
        after reporting a sell trade.
        """
        resp = self._http.post(f"/agents/{agent_name}/settle")
        return _parse_response(resp)

    # ─── Badge ───

    def badge(self, agent_name: str) -> Badge:
        """Get badge embed info for an agent."""
        resp = self._http.get(f"/agents/{agent_name}/badge")
        return _build_badge(_parse_response(resp))

    def badge_svg(self, agent_name: str) -> str:
        """Get the raw SVG badge for an agent."""
        resp = self._http.get(f"/agents/{agent_name}/badge.svg")
        if resp.status_code >= 400:
            raise BoutAPIError(resp.status_code, resp.text)
        return resp.text

    # ─── Leaderboard ───

    def leaderboard(self, limit: int = 20) -> List[AgentProfile]:
        """Get the global leaderboard."""
        resp = self._http.get("/leaderboard", params={"limit": limit})
        return [_build_profile(p) for p in _parse_response(resp)]

    # ─── Internal ───

    def _agent_name(self) -> str:
        raise BoutValidationError(
            "agent_name is required — pass it explicitly or use the agent's name"
        )


class AsyncBoutClient:
    """Async Bout API client — same interface as BoutClient but async.

    Usage:
        from bout import AsyncBoutClient

        async with AsyncBoutClient(api_key="your-bout-api-key") as client:
            await client.report_trade(
                ticker="KXNBA-26MAR22-LAKERS-YES",
                side="yes", action="buy",
                contracts=10, price_cents=45,
            )
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ):
        self.api_key = api_key
        self._http = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            headers={"x-bout-api-key": api_key},
        )

    async def close(self) -> None:
        await self._http.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

    @staticmethod
    async def register(
        name: str,
        display_name: str,
        creator: str,
        base_url: str = DEFAULT_BASE_URL,
    ) -> Agent:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                f"{base_url}/agents",
                json={"name": name, "display_name": display_name, "creator": creator},
            )
        return _build_agent(_parse_response(resp))

    async def profile(self, agent_name: str) -> AgentProfile:
        resp = await self._http.get(f"/agents/{agent_name}")
        return _build_profile(_parse_response(resp))

    async def report_trade(
        self,
        ticker: str,
        side: str,
        action: str,
        contracts: int,
        kalshi_order_id: str,
        price_cents: Optional[int] = None,
        market_title: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Trade:
        _validate_trade(ticker, side, action, contracts, kalshi_order_id, price_cents)
        body: dict = {
            "ticker": ticker,
            "side": side,
            "action": action,
            "contracts": contracts,
            "kalshi_order_id": kalshi_order_id,
        }
        if price_cents is not None:
            body["price_cents"] = price_cents
        if market_title:
            body["market_title"] = market_title
        if notes:
            body["notes"] = notes
        resp = await self._http.post("/trades", json=body)
        return _build_trade(_parse_response(resp))

    async def report_trades(self, trades: List[dict]) -> List[Trade]:
        resp = await self._http.post("/trades/batch", json={"trades": trades})
        return [_build_trade(t) for t in _parse_response(resp)]

    async def list_trades(
        self,
        agent_name: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[Trade]:
        params: dict = {"limit": limit}
        if agent_name:
            params["agent_name"] = agent_name
        if status:
            params["status"] = status
        resp = await self._http.get("/trades", params=params)
        return [_build_trade(t) for t in _parse_response(resp)]

    async def verify(self, agent_name: str) -> VerifyResult:
        resp = await self._http.post(f"/agents/{agent_name}/verify")
        return _build_verify_result(_parse_response(resp))

    async def settle(self, agent_name: str) -> dict:
        resp = await self._http.post(f"/agents/{agent_name}/settle")
        return _parse_response(resp)

    async def badge(self, agent_name: str) -> Badge:
        resp = await self._http.get(f"/agents/{agent_name}/badge")
        return _build_badge(_parse_response(resp))

    async def badge_svg(self, agent_name: str) -> str:
        resp = await self._http.get(f"/agents/{agent_name}/badge.svg")
        if resp.status_code >= 400:
            raise BoutAPIError(resp.status_code, resp.text)
        return resp.text

    async def leaderboard(self, limit: int = 20) -> List[AgentProfile]:
        resp = await self._http.get("/leaderboard", params={"limit": limit})
        return [_build_profile(p) for p in _parse_response(resp)]
