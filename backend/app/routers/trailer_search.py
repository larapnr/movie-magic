import logging

from fastapi import APIRouter, Query

from app.services.trailer_moments import search_moments

router = APIRouter(prefix="/api/trailer-search", tags=["trailer-search"])
log = logging.getLogger("uvicorn.error")


@router.get("")
def trailer_search(
    q: str = Query(min_length=1),
    youtube_key: str | None = None,
    title: str | None = None,
):
    try:
        result = search_moments(q, youtube_key=youtube_key, title=title)
    except Exception as exc:
        result = {
            "query": q,
            "matches": [],
            "reason": str(exc)[:300],
            "youtube_key": youtube_key,
            "mode": "none",
        }
    match = (result.get("matches") or [None])[0]
    if match:
        log.info(
            "trailer-search %r -> %s %ss-%ss",
            q,
            result.get("mode"),
            match.get("start_seconds"),
            match.get("end_seconds"),
        )
    else:
        log.info("trailer-search %r -> no match: %s", q, result.get("reason"))
    return result
