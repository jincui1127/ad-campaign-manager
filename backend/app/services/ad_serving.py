from sqlalchemy.orm import Session

from app import models, schemas


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

    winner = query.order_by(
        models.Campaign.bid_price.desc()
    ).first()

    return winner