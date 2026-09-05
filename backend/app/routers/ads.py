from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.services.ad_serving import select_ad


router = APIRouter(
    prefix="/ads",
    tags=["ads"],
)


@router.post(
    "/serve",
    response_model=schemas.AdServeResponse | None,
)
def serve_ad(
    request: schemas.AdServeRequest,
    db: Session = Depends(get_db),
):
    campaign = select_ad(
        db,
        request,
    )

    if campaign is None:
        return None

    return schemas.AdServeResponse(
        campaign_id=campaign.id,
        headline=campaign.headline,
        image_url=campaign.image_url,
        landing_page_url=campaign.landing_page_url,
        bid_price=campaign.bid_price,
    )