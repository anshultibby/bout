from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from database import get_db, init_db
from models import Agent, Trade, VerificationStatus
from schemas import (
    AgentCreate, AgentResponse, AgentPublicProfile, AgentStats,
    TradeReport, TradeResponse, TradeVerificationResult, VerifyAllResult,
    BadgeResponse,
)
from kalshi_client import KalshiVerifier
from badge import render_badge_svg

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Bout API",
    description=(
        "Verified leaderboard for AI trading agents on Kalshi. "
        "Bots self-report trades, Bout verifies them against the Kalshi API."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth helper ───

async def get_agent_by_api_key(
    x_bout_api_key: str = Header(..., description="Your Bout API key (returned on agent registration)"),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    result = await db.execute(select(Agent).where(Agent.api_key == x_bout_api_key))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return agent


# ─── Agent Registration ───

@app.post("/agents", response_model=AgentResponse, status_code=201, tags=["Agents"])
async def register_agent(body: AgentCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new trading agent.

    Returns a Bout API key — your bot uses this to report trades.
    Store it securely; it won't be shown again.
    """
    existing = await db.execute(select(Agent).where(Agent.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Agent name '{body.name}' is already taken")

    agent = Agent(
        name=body.name,
        display_name=body.display_name,
        creator=body.creator,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    return AgentResponse(
        id=agent.id,
        name=agent.name,
        display_name=agent.display_name,
        creator=agent.creator,
        api_key=agent.api_key,
        created_at=agent.created_at,
    )


@app.get("/agents/{agent_name}", response_model=AgentPublicProfile, tags=["Agents"])
async def get_agent_profile(agent_name: str, db: AsyncSession = Depends(get_db)):
    """
    Public profile for an agent — shows verified stats.
    No auth required. This is what gets embedded / linked to.
    """
    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    stats = await _compute_stats(agent.id, db)

    return AgentPublicProfile(
        name=agent.name,
        display_name=agent.display_name,
        creator=agent.creator,
        created_at=agent.created_at,
        last_verified_at=agent.last_verified_at,
        stats=stats,
    )


# ─── Trade Reporting ───

@app.post("/trades", response_model=TradeResponse, status_code=201, tags=["Trades"])
async def report_trade(
    body: TradeReport,
    agent: Agent = Depends(get_agent_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Report a trade your bot just made on Kalshi.

    Call this right after your bot places an order. Bout will log it
    and later verify it against Kalshi's fill records.
    """
    # Duplicate detection: same agent, ticker, side, action, contracts, price within 60s
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
    dup_check = await db.execute(
        select(Trade).where(
            and_(
                Trade.agent_id == agent.id,
                Trade.ticker == body.ticker,
                Trade.side == body.side,
                Trade.action == body.action,
                Trade.contracts == body.contracts,
                Trade.price_cents == body.price_cents,
                Trade.reported_at >= cutoff,
            )
        )
    )
    if dup_check.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Duplicate trade: a matching trade was reported in the last 60 seconds",
        )

    trade = Trade(
        agent_id=agent.id,
        ticker=body.ticker,
        side=body.side,
        action=body.action,
        contracts=body.contracts,
        price_cents=body.price_cents,
        market_title=body.market_title,
        notes=body.notes,
        status=VerificationStatus.pending.value,
    )
    db.add(trade)
    await db.commit()
    await db.refresh(trade)

    return _trade_to_response(trade)


@app.get("/trades", response_model=list[TradeResponse], tags=["Trades"])
async def list_trades(
    agent_name: str | None = None,
    status: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    List trades for an agent. Public endpoint — anyone can see verified trades.
    """
    query = select(Trade).join(Agent)
    if agent_name:
        query = query.where(Agent.name == agent_name)
    if status:
        query = query.where(Trade.status == status)
    query = query.order_by(Trade.reported_at.desc()).limit(min(limit, 200))

    result = await db.execute(query)
    return [_trade_to_response(t) for t in result.scalars().all()]


# ─── Verification ───

@app.post("/agents/{agent_name}/verify", response_model=VerifyAllResult, tags=["Verification"])
async def verify_agent_trades(
    agent_name: str,
    x_kalshi_key_id: str = Header(..., description="Your Kalshi API key ID"),
    x_kalshi_private_key: str = Header(..., description="Your Kalshi RSA private key (PEM). Sent per-request, never stored."),
    agent: Agent = Depends(get_agent_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify all pending trades against Kalshi's API.

    Pulls fills from Kalshi and matches them against self-reported trades.
    Kalshi credentials are provided per-request via headers — Bout never stores them.
    """
    if agent.name != agent_name:
        raise HTTPException(status_code=403, detail="API key does not match this agent")

    verifier = KalshiVerifier(x_kalshi_key_id, x_kalshi_private_key)

    # Get all pending trades
    result = await db.execute(
        select(Trade)
        .where(Trade.agent_id == agent.id, Trade.status == VerificationStatus.pending.value)
        .order_by(Trade.reported_at)
    )
    pending_trades = result.scalars().all()

    if not pending_trades:
        return VerifyAllResult(
            agent_name=agent.name,
            total_checked=0,
            verified=0,
            unverified=0,
            extra_found=0,
            details=[],
        )

    # Time-scope the Kalshi fill pull to the pending trade window (+ buffer)
    oldest_trade_time = min(t.reported_at for t in pending_trades)
    fill_since = oldest_trade_time - timedelta(seconds=600)

    try:
        fills = await verifier.get_fills(since=fill_since)
    except httpx.HTTPStatusError as exc:
        logger.error("Kalshi API returned %s: %s", exc.response.status_code, exc.response.text)
        if exc.response.status_code == 401:
            raise HTTPException(status_code=502, detail="Kalshi rejected your API credentials. Check your key and private key.")
        if exc.response.status_code == 403:
            raise HTTPException(status_code=502, detail="Kalshi API key lacks permission to read fills. Ensure it has read access.")
        raise HTTPException(status_code=502, detail=f"Kalshi API error: {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.error("Kalshi API request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach Kalshi API. Try again shortly.")

    # Collect fill IDs already used by previously verified trades (prevents re-matching)
    prev_result = await db.execute(
        select(Trade.kalshi_order_id)
        .where(Trade.agent_id == agent.id, Trade.status == VerificationStatus.verified.value)
        .where(Trade.kalshi_order_id.is_not(None))
    )
    used_fill_ids: set[str] = {row[0] for row in prev_result.all()}

    details: list[TradeVerificationResult] = []
    verified_count = 0
    unverified_count = 0

    for trade in pending_trades:
        match = _find_matching_fill(trade, fills, used_fill_ids)

        if match:
            fill_id = match.get("trade_id", match.get("order_id", ""))
            used_fill_ids.add(fill_id)

            trade.status = VerificationStatus.verified.value
            trade.kalshi_order_id = match.get("order_id")
            trade.kalshi_fill_price = match.get("yes_price") if trade.side == "yes" else match.get("no_price")
            trade.kalshi_fill_count = match.get("count")
            trade.verified_at = datetime.now(timezone.utc)
            # Populate fill time from Kalshi data
            fill_ts = match.get("created_time") or match.get("ts")
            if fill_ts:
                try:
                    trade.kalshi_fill_time = datetime.fromisoformat(fill_ts.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    pass
            verified_count += 1

            details.append(TradeVerificationResult(
                trade_id=trade.id,
                status="verified",
                kalshi_order_id=trade.kalshi_order_id,
                kalshi_fill_price=trade.kalshi_fill_price,
                kalshi_fill_count=trade.kalshi_fill_count,
                message=f"Matched Kalshi fill: {fill_id}",
            ))
        else:
            trade.status = VerificationStatus.unverified.value
            trade.verified_at = datetime.now(timezone.utc)
            unverified_count += 1

            details.append(TradeVerificationResult(
                trade_id=trade.id,
                status="unverified",
                kalshi_order_id=None,
                kalshi_fill_price=None,
                kalshi_fill_count=None,
                message="No matching Kalshi fill found",
            ))

    # Extra detection: fills on Kalshi that no trade in our system references
    all_agent_result = await db.execute(
        select(Trade.ticker, Trade.side, Trade.action)
        .where(Trade.agent_id == agent.id)
    )
    all_reported_keys = {(r[0], r[1], r[2]) for r in all_agent_result.all()}

    extra_count = 0
    for fill in fills:
        fill_key = (fill.get("ticker", ""), fill.get("side", ""), fill.get("action", ""))
        fill_id = fill.get("trade_id", fill.get("order_id", ""))
        if fill_id not in used_fill_ids and fill_key not in all_reported_keys:
            extra_count += 1

    agent.last_verified_at = datetime.now(timezone.utc)
    await db.commit()

    return VerifyAllResult(
        agent_name=agent.name,
        total_checked=len(pending_trades),
        verified=verified_count,
        unverified=unverified_count,
        extra_found=extra_count,
        details=details,
    )


# ─── Badge ───

@app.get("/agents/{agent_name}/badge.svg", tags=["Badge"])
async def get_badge(agent_name: str, db: AsyncSession = Depends(get_db)):
    """
    Embeddable SVG badge showing verified stats.
    Drop this in your X bio, GitHub README, or website.
    """
    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    stats = await _compute_stats(agent.id, db)
    svg = render_badge_svg(agent.display_name, stats)

    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "public, max-age=300"})


@app.get("/agents/{agent_name}/badge", response_model=BadgeResponse, tags=["Badge"])
async def get_badge_info(agent_name: str, db: AsyncSession = Depends(get_db)):
    """Badge metadata — URLs for embedding."""
    result = await db.execute(select(Agent).where(Agent.name == agent_name))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    stats = await _compute_stats(agent.id, db)
    base_url = "https://bout.markets"  # TODO: make configurable

    return BadgeResponse(
        agent_name=agent.name,
        verified_trades=stats.verified_trades,
        win_rate=stats.win_rate,
        roi_percent=stats.roi_percent,
        verification_rate=stats.verification_rate,
        badge_svg_url=f"{base_url}/api/agents/{agent.name}/badge.svg",
        profile_url=f"{base_url}/{agent.name}",
    )


# ─── Leaderboard ───

@app.get("/leaderboard", response_model=list[AgentPublicProfile], tags=["Leaderboard"])
async def leaderboard(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """
    Global leaderboard — agents ranked by verified ROI.
    """
    result = await db.execute(select(Agent).order_by(Agent.created_at))
    agents = result.scalars().all()

    profiles = []
    for agent in agents:
        stats = await _compute_stats(agent.id, db)
        if stats.verified_trades == 0:
            continue
        profiles.append(AgentPublicProfile(
            name=agent.name,
            display_name=agent.display_name,
            creator=agent.creator,
            created_at=agent.created_at,
            last_verified_at=agent.last_verified_at,
            stats=stats,
        ))

    # Sort by ROI descending
    profiles.sort(key=lambda p: p.stats.roi_percent or 0, reverse=True)
    return profiles[:limit]


# ─── Helpers ───

def _trade_to_response(trade: Trade) -> TradeResponse:
    return TradeResponse(
        id=trade.id,
        ticker=trade.ticker,
        side=trade.side,
        action=trade.action,
        contracts=trade.contracts,
        price_cents=trade.price_cents,
        status=trade.status,
        reported_at=trade.reported_at,
        market_title=trade.market_title,
        kalshi_order_id=trade.kalshi_order_id,
        kalshi_fill_price=trade.kalshi_fill_price,
        verified_at=trade.verified_at,
    )


def _parse_fill_time(fill: dict) -> datetime | None:
    """Extract and parse the fill timestamp from Kalshi data."""
    raw = fill.get("created_time") or fill.get("ts")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _find_matching_fill(
    trade: Trade, fills: list[dict], used_ids: set[str],
    time_tolerance_seconds: int = 300,
) -> dict | None:
    """Find a Kalshi fill that matches a reported trade.

    Matches on ticker, side, action, contract count, price (±5c),
    and fill time (within tolerance of the reported_at timestamp).
    """
    for fill in fills:
        fill_id = fill.get("trade_id", fill.get("order_id", ""))
        if fill_id in used_ids:
            continue

        if (fill.get("ticker") == trade.ticker and
            fill.get("side") == trade.side and
            fill.get("action") == trade.action and
            fill.get("count") == trade.contracts):
            # Price tolerance: fill price may differ from limit price
            fill_price = fill.get("yes_price") if trade.side == "yes" else fill.get("no_price")
            if fill_price is None or abs(fill_price - trade.price_cents) > 5:
                continue

            # Time tolerance: fill must be near the reported trade time
            fill_time = _parse_fill_time(fill)
            if fill_time is not None:
                reported = trade.reported_at.replace(tzinfo=timezone.utc) if trade.reported_at.tzinfo is None else trade.reported_at
                delta = abs((fill_time - reported).total_seconds())
                if delta > time_tolerance_seconds:
                    continue

            return fill
    return None


async def _compute_stats(agent_id: str, db: AsyncSession) -> AgentStats:
    """Compute verified stats for an agent."""
    result = await db.execute(select(Trade).where(Trade.agent_id == agent_id))
    trades = result.scalars().all()

    total = len(trades)
    verified = sum(1 for t in trades if t.status == VerificationStatus.verified.value)
    unverified = sum(1 for t in trades if t.status == VerificationStatus.unverified.value)
    pending = sum(1 for t in trades if t.status == VerificationStatus.pending.value)
    extra = sum(1 for t in trades if t.status == VerificationStatus.extra.value)

    # Compute P&L from verified trades only
    total_pnl_cents = 0
    wins = 0
    settled_count = 0

    verified_trades = [t for t in trades if t.status == VerificationStatus.verified.value]
    for t in verified_trades:
        fill_price = t.kalshi_fill_price or t.price_cents
        if t.action == "buy":
            # Bought at fill_price, settles at 100 (win) or 0 (loss)
            # For now we can't know settlement without more data,
            # so we track cost basis
            total_pnl_cents -= fill_price * t.contracts
        else:
            total_pnl_cents += fill_price * t.contracts

    reported_count = total - extra
    verification_rate = (verified / reported_count) if reported_count > 0 else 0.0

    # ROI placeholder — needs settlement data for real computation
    total_invested = sum(
        (t.kalshi_fill_price or t.price_cents) * t.contracts
        for t in verified_trades
        if t.action == "buy"
    )
    roi = (total_pnl_cents / total_invested * 100) if total_invested > 0 else None

    return AgentStats(
        total_trades=total,
        verified_trades=verified,
        unverified_trades=unverified,
        pending_trades=pending,
        extra_trades=extra,
        win_rate=None,  # needs settlement data
        roi_percent=roi,
        total_pnl_cents=total_pnl_cents,
        verification_rate=round(verification_rate, 3),
    )
