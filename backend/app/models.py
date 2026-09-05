from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    headline: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    landing_page_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    total_budget: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    daily_budget: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    bid_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    country: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True,
    )

    device: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    spent: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    impressions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    clicks: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )



class AdEvent(Base):
    __tablename__ = "ad_events"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    event_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    campaign_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    user_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )