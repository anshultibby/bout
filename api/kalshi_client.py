"""
Lightweight Kalshi API client for trade verification.
Read-only — only uses GET endpoints to pull fills and positions.
"""

import hashlib
import time
import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives.asymmetric import padding, utils as crypto_utils
from cryptography.hazmat.primitives import hashes, serialization

import httpx

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"


def _sign_request(api_key_id: str, private_key_pem: str, method: str, path: str) -> dict:
    """Generate Kalshi RSA-PS256 auth headers."""
    ts = str(int(time.time() * 1000))
    message = ts + method.upper() + path

    key = serialization.load_pem_private_key(private_key_pem.encode(), password=None)
    signature = key.sign(
        message.encode(),
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=hashes.SHA256().digest_size,
        ),
        hashes.SHA256(),
    )

    return {
        "KALSHI-ACCESS-KEY": api_key_id,
        "KALSHI-ACCESS-TIMESTAMP": ts,
        "KALSHI-ACCESS-SIGNATURE": base64.b64encode(signature).decode(),
        "Content-Type": "application/json",
    }


class KalshiVerifier:
    """Read-only Kalshi client for verifying trades."""

    def __init__(self, api_key_id: str, private_key_pem: str):
        self.api_key_id = api_key_id
        self.private_key_pem = private_key_pem

    async def _get(self, path: str, params: dict | None = None) -> dict:
        headers = _sign_request(self.api_key_id, self.private_key_pem, "GET", path)
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30) as client:
            resp = await client.get(path, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, dict):
                raise ValueError(f"Kalshi returned unexpected response type: {type(data).__name__}")
            return data

    async def _get_all(self, path: str, params: dict | None = None, collection_key: str | None = None) -> list:
        """Auto-paginate a Kalshi list endpoint."""
        if params is None:
            params = {}

        # Auto-detect collection key
        if collection_key is None:
            if "fills" in path:
                collection_key = "fills"
            elif "orders" in path:
                collection_key = "orders"
            elif "positions" in path:
                collection_key = "market_positions"
            elif "settlements" in path:
                collection_key = "settlements"
            else:
                collection_key = "items"

        all_items = []
        params["limit"] = 200
        cursor = None

        for _ in range(20):  # safety limit
            if cursor:
                params["cursor"] = cursor
            data = await self._get(path, params)
            items = data.get(collection_key, [])
            all_items.extend(items)
            cursor = data.get("cursor")
            if not cursor or not items:
                break

        return all_items

    async def get_fills(self, since: datetime | None = None) -> list[dict]:
        """Get all fills (executed trades) from Kalshi."""
        params = {}
        if since:
            params["min_ts"] = int(since.timestamp())
        return await self._get_all("/portfolio/fills", params, "fills")

    async def get_orders(self, since: datetime | None = None) -> list[dict]:
        """Get all orders from Kalshi."""
        params = {}
        if since:
            params["min_ts"] = int(since.timestamp())
        return await self._get_all("/portfolio/orders", params, "orders")

    async def get_positions(self) -> list[dict]:
        """Get current positions."""
        return await self._get_all("/portfolio/positions", {"count_filter": "position"}, "market_positions")

    async def get_balance(self) -> dict:
        """Get account balance."""
        return await self._get("/portfolio/balance")

    async def verify_fill(self, ticker: str, side: str, action: str,
                          price_cents: int, contracts: int,
                          reported_at: datetime, tolerance_seconds: int = 300) -> dict | None:
        """
        Try to find a matching Kalshi fill for a reported trade.

        Returns the matching fill dict if found, None otherwise.
        Matches on: ticker, side, action, approximate price, approximate time.
        """
        # Pull recent fills
        search_start = datetime.fromtimestamp(
            reported_at.timestamp() - tolerance_seconds, tz=timezone.utc
        )
        fills = await self.get_fills(since=search_start)

        for fill in fills:
            fill_ticker = fill.get("ticker", "")
            fill_side = fill.get("side", "")
            fill_action = fill.get("action", "")
            fill_price = fill.get("yes_price") if side == "yes" else fill.get("no_price")
            fill_count = fill.get("count", 0)

            # Match criteria
            if (fill_ticker == ticker and
                fill_side == side and
                fill_action == action and
                fill_count == contracts):
                # Price within 5 cents tolerance (limit vs fill price can differ)
                if fill_price is not None and abs(fill_price - price_cents) <= 5:
                    return fill

        return None
