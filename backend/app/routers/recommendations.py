from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..models import MediaType
from ..store import get_store
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/genre")
async def by_genre(genre: str, type: MediaType = MediaType.movie):
    """Step 1: genre based suggestions (works without an account)."""
    return await tmdb_get(
        f"/discover/{type.value}",
        {"with_genres": genre, "sort_by": "vote_average.desc", "vote_count.gte": 300},
    )


@router.get("/me")
async def for_user(type: MediaType = MediaType.movie, user: dict = Depends(current_user)):
    """Step 2: user specific suggestions from saved activity.

    Simple baseline: count the genres across the user's saved items and recommend
    highly rated titles from their top genres. Replace with something smarter later.
    Sentiment based recommendations (step 3) would plug in here as an extra signal.
    """
    counts: Counter = Counter()
    seen: set[int] = set()
    for item in get_store().saved_items(user["uid"]):
        seen.add(item["tmdb_id"])
        counts.update(item.get("genre_ids", []))

    if not counts:
        raise HTTPException(status_code=404, detail="Save some titles first to get recommendations")

    top = [str(g) for g, _ in counts.most_common(2)]
    data = await tmdb_get(
        f"/discover/{type.value}",
        {"with_genres": "|".join(top), "sort_by": "vote_average.desc", "vote_count.gte": 300},
    )
    data["results"] = [r for r in data.get("results", []) if r["id"] not in seen]
    return data
