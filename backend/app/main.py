from app.services.trailer_moments import search_moments
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .config import settings
from .routers import (
    account,
    details,
    favorites,
    recommendations,
    reviews,
    search,
    trailer_search,
    trending,
    yolo,
)

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="Movie Magic API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (account, search, details, trending, yolo, reviews, favorites, recommendations, trailer_search):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
