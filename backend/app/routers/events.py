from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.services.tracking import record_click, record_impression


router = APIRouter(
    prefix="/events",
    tags=["events"],
)


@router.post(
    "/impression",
    response_model=schemas.AdEventResponse,
)
def create_impression(
    event: schemas.AdEventCreate,
    db: Session = Depends(get_db),
):
    result = record_impression(
        db,
        event,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to record impression",
        )

    return result


@router.post(
    "/click",
    response_model=schemas.AdEventResponse,
)
def create_click(
    event: schemas.AdEventCreate,
    db: Session = Depends(get_db),
):
    result = record_click(
        db,
        event,
    )

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to record click",
        )

    return result