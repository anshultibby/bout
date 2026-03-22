from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db
from models import Agent, Trade, VerificationStatus
from schemas import (
    AgentCreate, AgentResponse, AgentPublicProfile, AgentStats,
    TradeReport, TradeResponse, TradeVerificationResult, VerifyAllResult,
    BadgeResponse,
)
from kalshi_client import KalshiVerifier
from badge import render_badge_svg


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
        kalshi_api_key_id=body.kalshi_api_key_id,
        kalshi_private_key=body.kalshi_private_key,
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
        kalshi_connected=agent.kalshi_api_key_id is not None,
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
    agent: Agent = Depends(get_agent_by_api_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify all pending trades against Kalshi's API.

    Pulls fills from Kalshi and matches them against self-reported trades.
    Requires the agent's Kalshi credentials to be configured.
    """
    if agent.name != agent_name:
        raise HTTPException(status_code=403, detail="API key does not match this agent")

    if not agent.kalshi_api_key_id or not agent.kalshi_private_key:
        raise HTTPException(
            status_code=400,
            detail="Kalshi credentials not configured. Update your agent with kalshi_api_key_id and kalshi_private_key.",
        )

    verifier = KalshiVerifier(agent.kalshi_api_key_id, agent.kalshi_private_key)

    # Get all pending trades
    result = await db.execute(
        select(Trade)
        .where(Trade.agent_id == agent.id, Trade.status == VerificationStatus.pending.value)
        .order_by(Trade.reported_at)
    )
    pending_trades = result.scalars().all()

    # Pull all recent fills from Kalshi
    fills = await verifier.get_fills()

    details: list[TradeVerificationResult] = []
    verified_count = 0
    unverified_count = 0
    used_fill_ids: set[str] = set()

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

    # Check for extra trades on Kalshi that weren't reported
    all_reported_tickers = {(t.ticker, t.side, t.action) for t in pending_trades}
    extra_count = 0
    for fill in fills:
        fill_key = (fill.get("ticker", ""), fill.get("side", ""), fill.get("action", ""))
        fill_id = fill.get("trade_id", fill.get("order_id", ""))
        if fill_id not in used_fill_ids and fill_key not in all_reported_tickers:
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


def _find_matching_fill(trade: Trade, fills: list[dict], used_ids: set[str]) -> dict | None:
    """Find a Kalshi fill that matches a reported trade."""
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
            if fill_price is not None and abs(fill_price - trade.price_cents) <= 5:
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
