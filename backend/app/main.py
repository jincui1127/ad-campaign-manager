from fastapi import FastAPI

from app.database import Base, engine
from app.routers import ads, campaigns


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Ad Campaign Manager API",
)


app.include_router(campaigns.router)
app.include_router(ads.router)


@app.get("/")
def root():
    return {
        "message": "Ad Campaign Manager API"
    }
