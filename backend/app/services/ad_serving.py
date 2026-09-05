from sqlalchemy.orm import Session

from app import models, schemas

from datetime import datetime, timedelta

FREQUENCY_CAP = 3
FREQUENCY_WINDOW_HOURS = 1

def select_ad(
    db: Session,
    request: schemas.AdServeRequest,
):
    query = db.query(models.Campaign).filter(
        models.Campaign.is_active.is_(True),
        models.Campaign.spent < models.Campaign.total_budget,
        models.Campaign.country == request.country,
        models.Campaign.device == request.device,
    )

    if request.category is not None:
        query = query.filter(
            models.Campaign.category == request.category
        )

    candidates = query.order_by(
        models.Campaign.bid_price.desc()
    ).all()

    for campaign in candidates:
        if not has_reached_frequency_cap(
            db,
            request.user_id,
            campaign.id,
        ):
            return campaign
    return None


def has_reached_frequency_cap(
    db: Session,
    user_id: str,
    campaign_id: int,
) -> bool:
    window_start = datetime.utcnow() - timedelta(
        hours=FREQUENCY_WINDOW_HOURS
    )

    impression_count = (
        db.query(models.AdEvent)
        .filter(
            models.AdEvent.user_id == user_id,
            models.AdEvent.campaign_id == campaign_id,
            models.AdEvent.event_type == "impression",
            models.AdEvent.created_at >= window_start,
        )
        .count()
    )

    return impression_count >= FREQUENCY_CAP