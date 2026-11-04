import random

from fastapi import APIRouter, HTTPException

from ..models import MediaType
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api", tags=["yolo"])


@router.get("/yolo")
async def yolo(genre: str | None = None, type: MediaType = MediaType.movie):
    """Random title with a YouTube trailer. Re-rolls up to 3 times if no trailer is found."""
    for _ in range(3):
        page = random.randint(1, 20)
        listing = await tmdb_get(
            f"/discover/{type.value}",
            {"with_genres": genre, "page": page, "vote_count.gte": 200},
        )
        results = listing.get("results", [])
        if not results:
            continue
        pick = random.choice(results)
        videos = await tmdb_get(f"/{type.value}/{pick['id']}/videos")
        trailer = next(
            (v for v in videos.get("results", []) if v["site"] == "YouTube" and v["type"] == "Trailer"),
            None,
        )
        if trailer:
            return {**pick, "media_type": type.value, "trailerKey": trailer["key"]}
    raise HTTPException(status_code=404, detail="No trailer found, try again")
