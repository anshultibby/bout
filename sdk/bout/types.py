"""Response types returned by the Bout SDK."""

from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List


@dataclass(frozen=True)
class Agent:
    id: str
    name: str
    display_name: str
    creator: str
    api_key: str
    created_at: str


@dataclass(frozen=True)
class AgentStats:
    total_trades: int
    verified_trades: int
    unverified_trades: int
    pending_trades: int
    extra_trades: int
    win_rate: Optional[float]
    roi_percent: Optional[float]
    total_pnl_cents: int
    verification_rate: float


@dataclass(frozen=True)
class AgentProfile:
    name: str
    display_name: str
    creator: str
    created_at: str
    last_verified_at: Optional[str]
    stats: AgentStats


@dataclass(frozen=True)
class Trade:
    id: str
    ticker: str
    side: str
    action: str
    contracts: int
    price_cents: Optional[int]
    status: str
    reported_at: str
    market_title: Optional[str]
    kalshi_order_id: Optional[str]
    kalshi_fill_price: Optional[int]
    verified_at: Optional[str]
    resolution: Optional[str]
    pnl_cents: Optional[int]


@dataclass(frozen=True)
class TradeVerification:
    trade_id: str
    status: str
    kalshi_order_id: Optional[str]
    kalshi_fill_price: Optional[int]
    kalshi_fill_count: Optional[int]
    message: str


@dataclass(frozen=True)
class VerifyResult:
    agent_name: str
    total_checked: int
    verified: int
    unverified: int
    extra_found: int
    details: List[TradeVerification]


@dataclass(frozen=True)
class Badge:
    agent_name: str
    verified_trades: int
    win_rate: Optional[float]
    roi_percent: Optional[float]
    verification_rate: float
    badge_svg_url: str
    profile_url: str
