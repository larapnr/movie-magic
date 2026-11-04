from fastapi import APIRouter, Query

from ..models import MediaType
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api", tags=["trending"])


@router.get("/trending")
async def trending(window: str = Query(default="week", pattern="^(day|week)$")):
    return await tmdb_get(f"/trending/all/{window}")


@router.get("/popular")
async def popular(type: MediaType = MediaType.tv, page: int = Query(default=1, ge=1, le=500)):
    return await tmdb_get(f"/{type.value}/popular", {"page": page})


@router.get("/upcoming")
async def upcoming(page: int = Query(default=1, ge=1, le=500)):
    return await tmdb_get("/movie/upcoming", {"page": page})
