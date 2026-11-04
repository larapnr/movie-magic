from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/trailer-search", tags=["trailer-search"])


@router.get("")
async def trailer_search(q: str = Query(min_length=1)):
    """Scene level trailer search (feature area 5).

    Placeholder until the existing prototype is wired in. Planned response shape:
    {
      "query": "car chase in the rain",
      "matches": [
        {"tmdb_id": 603, "media_type": "movie", "title": "...", "youtube_key": "...",
         "start_seconds": 42, "end_seconds": 51, "score": 0.83}
      ]
    }
    The frontend can open the embed at a moment with ?start=<start_seconds>.
    """
    raise HTTPException(status_code=501, detail="Trailer scene search not implemented yet")
