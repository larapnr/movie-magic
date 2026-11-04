from fastapi import APIRouter, Query

from ..models import MediaType
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(
    q: str = Query(min_length=1),
    type: str = Query(default="multi", pattern="^(multi|movie|tv)$"),
    page: int = Query(default=1, ge=1, le=500),
):
    """Search by title. type=multi searches movies, TV and people together."""
    return await tmdb_get(f"/search/{type}", {"query": q, "page": page})


@router.get("/discover")
async def discover(
    type: MediaType = MediaType.movie,
    genre: str | None = None,
    year: int | None = None,
    sort_by: str = "popularity.desc",
    page: int = Query(default=1, ge=1, le=500),
):
    """Filter by genre (comma separated ids) and release year."""
    year_key = "primary_release_year" if type == MediaType.movie else "first_air_date_year"
    return await tmdb_get(
        f"/discover/{type.value}",
        {"with_genres": genre, year_key: year, "sort_by": sort_by, "page": page},
    )


@router.get("/genres")
async def genres(type: MediaType = MediaType.movie):
    return await tmdb_get(f"/genre/{type.value}/list")
