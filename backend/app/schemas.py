from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CampaignBase(BaseModel):
    name: str
    headline: str
    image_url: str
    landing_page_url: str

    total_budget: float
    daily_budget: float
    bid_price: float

    country: str
    device: str
    category: str | None = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: str | None = None
    headline: str | None = None
    image_url: str | None = None
    landing_page_url: str | None = None

    total_budget: float | None = None
    daily_budget: float | None = None
    bid_price: float | None = None

    country: str | None = None
    device: str | None = None
    category: str | None = None

    is_active: bool | None = None


class CampaignResponse(CampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    spent: float
    impressions: int
    clicks: int
    created_at: datetime



class AdServeRequest(BaseModel):
    user_id: str
    country: str
    device: str
    category: str | None = None


class AdServeResponse(BaseModel):
    campaign_id: int
    headline: str
    image_url: str
    landing_page_url: str
    bid_price: float



class AdEventCreate(BaseModel):
    event_id: str
    campaign_id: int
    user_id: str


class AdEventResponse(BaseModel):
    event_id: str
    campaign_id: int
    user_id: str
    event_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)