from pydantic import BaseModel, Field
from datetime import datetime


# ─── Agent Registration ───

class AgentCreate(BaseModel):
    name: str = Field(..., pattern=r"^[A-Za-z0-9_-]+$", min_length=2, max_length=40,
                      description="Unique agent slug (letters, numbers, hyphens, underscores)")
    display_name: str = Field(..., min_length=1, max_length=60)
    creator: str = Field(..., description="Creator handle, e.g. @username")
    kalshi_api_key_id: str | None = Field(None, description="Kalshi API key ID (read-only)")
    kalshi_private_key: str | None = Field(None, description="Kalshi RSA private key PEM (read-only)")


class AgentResponse(BaseModel):
    id: str
    name: str
    display_name: str
    creator: str
    api_key: str  # only returned on creation
    kalshi_connected: bool
    created_at: datetime


class AgentPublicProfile(BaseModel):
    name: str
    display_name: str
    creator: str
    created_at: datetime
    last_verified_at: datetime | None
    stats: "AgentStats"


class AgentStats(BaseModel):
    total_trades: int
    verified_trades: int
    unverified_trades: int
    pending_trades: int
    extra_trades: int  # on Kalshi but not reported
    win_rate: float | None
    roi_percent: float | None
    total_pnl_cents: int
    verification_rate: float  # verified / total reported


# ─── Trade Reporting ───

class TradeReport(BaseModel):
    """What a bot sends when it makes a trade."""
    ticker: str = Field(..., description="Kalshi market ticker, e.g. KXNBAGAME-26MAR09OTTVAN-YES")
    side: str = Field(..., pattern=r"^(yes|no)$", description="yes or no")
    action: str = Field(..., pattern=r"^(buy|sell)$", description="buy or sell")
    contracts: int = Field(..., gt=0, description="Number of contracts")
    price_cents: int = Field(..., ge=1, le=99, description="Limit price in cents (1-99)")
    market_title: str | None = Field(None, description="Human-readable market title")
    notes: str | None = Field(None, description="Optional notes about the trade rationale")


class TradeResponse(BaseModel):
    id: str
    ticker: str
    side: str
    action: str
    contracts: int
    price_cents: int
    status: str
    reported_at: datetime
    market_title: str | None
    kalshi_order_id: str | None
    kalshi_fill_price: int | None
    verified_at: datetime | None


class TradeVerificationResult(BaseModel):
    trade_id: str
    status: str  # verified, unverified
    kalshi_order_id: str | None
    kalshi_fill_price: int | None
    kalshi_fill_count: int | None
    message: str


class VerifyAllResult(BaseModel):
    agent_name: str
    total_checked: int
    verified: int
    unverified: int
    extra_found: int  # trades on Kalshi the bot never reported
    details: list[TradeVerificationResult]


# ─── Badge ───

class BadgeResponse(BaseModel):
    agent_name: str
    verified_trades: int
    win_rate: float | None
    roi_percent: float | None
    verification_rate: float
    badge_svg_url: str
    profile_url: str
