from fastapi import APIRouter, Depends, HTTPException

from ..auth import current_user
from ..models import MediaType, ReviewIn
from ..store import get_store, now_iso

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/{media_type}/{tmdb_id}")
def list_reviews(media_type: MediaType, tmdb_id: int):
    return get_store().reviews_for_title(media_type.value, tmdb_id)


@router.get("/{media_type}/{tmdb_id}/summary")
def summary(media_type: MediaType, tmdb_id: int):
    ratings = [r["rating"] for r in get_store().reviews_for_title(media_type.value, tmdb_id)]
    avg = round(sum(ratings) / len(ratings), 2) if ratings else None
    return {"average": avg, "count": len(ratings)}


@router.put("/{media_type}/{tmdb_id}")
def upsert_review(
    media_type: MediaType,
    tmdb_id: int,
    body: ReviewIn,
    user: dict = Depends(current_user),
):
    store = get_store()
    existing = store.get_review(user["uid"], media_type.value, tmdb_id)
    now = now_iso()
    data = {
        "uid": user["uid"],
        "display_name": body.display_name
        or user.get("name")
        or (user.get("email") or "").split("@")[0]
        or "Anonymous",
        "tmdb_id": tmdb_id,
        "media_type": media_type.value,
        "rating": body.rating,
        "text": body.text,
        "created_at": existing["created_at"] if existing else now,
        "updated_at": now,
    }
    store.put_review(data)
    return data


@router.delete("/{media_type}/{tmdb_id}", status_code=204)
def delete_review(media_type: MediaType, tmdb_id: int, user: dict = Depends(current_user)):
    if not get_store().delete_review(user["uid"], media_type.value, tmdb_id):
        raise HTTPException(status_code=404, detail="Review not found")
