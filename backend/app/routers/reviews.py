from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter

from ..auth import current_user
from ..db import get_db
from ..models import MediaType, ReviewIn

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _doc_id(uid: str, media_type: MediaType, tmdb_id: int) -> str:
    # One review per user per title: the id itself enforces it.
    return f"{uid}_{media_type.value}_{tmdb_id}"


def _title_query(media_type: MediaType, tmdb_id: int):
    return (
        get_db()
        .collection("reviews")
        .where(filter=FieldFilter("tmdb_id", "==", tmdb_id))
        .where(filter=FieldFilter("media_type", "==", media_type.value))
    )


@router.get("/{media_type}/{tmdb_id}")
def list_reviews(media_type: MediaType, tmdb_id: int):
    items = [d.to_dict() for d in _title_query(media_type, tmdb_id).stream()]
    items.sort(key=lambda r: r["created_at"], reverse=True)
    return items


@router.get("/{media_type}/{tmdb_id}/summary")
def summary(media_type: MediaType, tmdb_id: int):
    ratings = [d.to_dict()["rating"] for d in _title_query(media_type, tmdb_id).stream()]
    avg = round(sum(ratings) / len(ratings), 2) if ratings else None
    return {"average": avg, "count": len(ratings)}


@router.put("/{media_type}/{tmdb_id}")
def upsert_review(
    media_type: MediaType,
    tmdb_id: int,
    body: ReviewIn,
    user: dict = Depends(current_user),
):
    ref = get_db().collection("reviews").document(_doc_id(user["uid"], media_type, tmdb_id))
    existing = ref.get()
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "uid": user["uid"],
        "display_name": body.display_name or (user.get("email") or "").split("@")[0],
        "tmdb_id": tmdb_id,
        "media_type": media_type.value,
        "rating": body.rating,
        "text": body.text,
        "created_at": existing.to_dict()["created_at"] if existing.exists else now,
        "updated_at": now,
    }
    ref.set(data)
    return data


@router.delete("/{media_type}/{tmdb_id}", status_code=204)
def delete_review(media_type: MediaType, tmdb_id: int, user: dict = Depends(current_user)):
    ref = get_db().collection("reviews").document(_doc_id(user["uid"], media_type, tmdb_id))
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Review not found")
    ref.delete()
