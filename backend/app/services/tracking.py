from sqlalchemy.orm import Session

from app import models, schemas

from app.services.ad_serving import has_reached_frequency_cap

def record_impression(
    db: Session,
    event: schemas.AdEventCreate,
):
    existing_event = db.query(models.AdEvent).filter(
        models.AdEvent.event_id == event.event_id
    ).first()

    if existing_event is not None:
        return existing_event

    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == event.campaign_id
    ).first()

    if campaign is None:
        return None

    if not campaign.is_active:
        return None

    if has_reached_frequency_cap(
       db,
       event.user_id,
       event.campaign_id,
    ):
        return None

    if campaign.spent + campaign.bid_price > campaign.total_budget:
        return None

    db_event = models.AdEvent(
        event_id=event.event_id,
        campaign_id=event.campaign_id,
        user_id=event.user_id,
        event_type="impression",
    )

    campaign.impressions += 1
    campaign.spent += campaign.bid_price

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event



def record_click(
    db: Session,
    event: schemas.AdEventCreate,
):
    existing_event = db.query(models.AdEvent).filter(
        models.AdEvent.event_id == event.event_id
    ).first()

    if existing_event is not None:
        return existing_event

    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == event.campaign_id
    ).first()

    if campaign is None:
        return None

    db_event = models.AdEvent(
        event_id=event.event_id,
        campaign_id=event.campaign_id,
        user_id=event.user_id,
        event_type="click",
    )

    campaign.clicks += 1

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event