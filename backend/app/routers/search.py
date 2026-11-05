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
    # Rating sorts are meaningless for titles with a handful of votes, so require a minimum.
    min_votes = 200 if sort_by.startswith("vote_average") else None
    return await tmdb_get(
        f"/discover/{type.value}",
        {"with_genres": genre, year_key: year, "sort_by": sort_by, "page": page, "vote_count.gte": min_votes},
    )


@router.get("/genres")
async def genres(type: MediaType = MediaType.movie):
    return await tmdb_get(f"/genre/{type.value}/list")
