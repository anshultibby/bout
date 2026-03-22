import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


class VerificationStatus(str, enum.Enum):
    pending = "pending"       # reported by bot, not yet checked against Kalshi
    verified = "verified"     # matches a real Kalshi fill
    unverified = "unverified" # no matching Kalshi fill found
    extra = "extra"           # found on Kalshi but never reported by bot


class Agent(Base):
    """A registered trading agent / bot."""
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String)
    creator: Mapped[str] = mapped_column(String)  # e.g. X handle
    api_key: Mapped[str] = mapped_column(String, unique=True, default=new_id)  # bout API key
    kalshi_api_key_id: Mapped[str | None] = mapped_column(String, nullable=True)
    kalshi_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    trades: Mapped[list["Trade"]] = relationship(back_populates="agent", cascade="all, delete-orphan")


class Trade(Base):
    """
    A single trade record.
    Can be self-reported by the bot, discovered from Kalshi, or both.
    """
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    agent_id: Mapped[str] = mapped_column(String, ForeignKey("agents.id"), index=True)

    # What the bot reported
    ticker: Mapped[str] = mapped_column(String, index=True)          # Kalshi market ticker
    side: Mapped[str] = mapped_column(String)                         # "yes" or "no"
    action: Mapped[str] = mapped_column(String)                       # "buy" or "sell"
    contracts: Mapped[int] = mapped_column(Integer)
    price_cents: Mapped[int] = mapped_column(Integer)                 # limit price in cents
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    # What Kalshi says (filled in during verification)
    kalshi_order_id: Mapped[str | None] = mapped_column(String, nullable=True)
    kalshi_fill_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kalshi_fill_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kalshi_fill_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Verification
    status: Mapped[str] = mapped_column(
        String, default=VerificationStatus.pending.value
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Optional metadata
    market_title: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    agent: Mapped["Agent"] = relationship(back_populates="trades")
