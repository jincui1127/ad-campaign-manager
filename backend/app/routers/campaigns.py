from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db


router = APIRouter(
    prefix="/campaigns",
    tags=["campaigns"],
)


@router.post(
    "",
    response_model=schemas.CampaignResponse,
)
def create_campaign(
    campaign: schemas.CampaignCreate,
    db: Session = Depends(get_db),
):
    return crud.create_campaign(
        db,
        campaign,
    )


@router.get(
    "",
    response_model=list[schemas.CampaignResponse],
)
def list_campaigns(
    db: Session = Depends(get_db),
):
    return crud.get_campaigns(db)


@router.get(
    "/{campaign_id}",
    response_model=schemas.CampaignResponse,
)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
):
    campaign = crud.get_campaign(
        db,
        campaign_id,
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return campaign


@router.patch(
    "/{campaign_id}",
    response_model=schemas.CampaignResponse,
)
def update_campaign(
    campaign_id: int,
    campaign_update: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
):
    campaign = crud.update_campaign(
        db,
        campaign_id,
        campaign_update,
    )

    if campaign is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign not found",
        )

    return campaign