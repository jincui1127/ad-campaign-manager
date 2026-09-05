from sqlalchemy.orm import Session

from app import models, schemas


def create_campaign(
    db: Session,
    campaign: schemas.CampaignCreate,
):
    db_campaign = models.Campaign(
        **campaign.model_dump()
    )

    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)

    return db_campaign


def get_campaigns(db: Session):
    return db.query(models.Campaign).order_by(
        models.Campaign.id
    ).all()


def get_campaign(
    db: Session,
    campaign_id: int,
):
    return db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id
    ).first()


def update_campaign(
    db: Session,
    campaign_id: int,
    campaign_update: schemas.CampaignUpdate,
):
    db_campaign = get_campaign(db, campaign_id)

    if db_campaign is None:
        return None

    update_data = campaign_update.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(db_campaign, field, value)

    db.commit()
    db.refresh(db_campaign)

    return db_campaign