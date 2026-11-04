from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from google.cloud.firestore_v1.base_query import FieldFilter

from ..auth import current_user
from ..db import get_db
from ..models import ListName, MediaType, SavedItemIn

router = APIRouter(prefix="/api/me/lists", tags=["lists"])


def _doc_id(uid: str, list_name: ListName, media_type: MediaType, tmdb_id: int) -> str:
    return f"{uid}_{list_name.value}_{media_type.value}_{tmdb_id}"


@router.get("/{list_name}")
def get_list(list_name: ListName, user: dict = Depends(current_user)):
    """list_name is one of: favorite, watchlist, watched."""
    docs = (
        get_db()
        .collection("saved_items")
        .where(filter=FieldFilter("uid", "==", user["uid"]))
        .where(filter=FieldFilter("list", "==", list_name.value))
        .stream()
    )
    items = [d.to_dict() for d in docs]
    items.sort(key=lambda i: i["added_at"], reverse=True)
    return items


@router.put("/{list_name}/{media_type}/{tmdb_id}")
def add_item(
    list_name: ListName,
    media_type: MediaType,
    tmdb_id: int,
    body: SavedItemIn,
    user: dict = Depends(current_user),
):
    data = {
        "uid": user["uid"],
        "list": list_name.value,
        "media_type": media_type.value,
        "tmdb_id": tmdb_id,
        "title": body.title,
        "poster_path": body.poster_path,
        "genre_ids": body.genre_ids,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    get_db().collection("saved_items").document(
        _doc_id(user["uid"], list_name, media_type, tmdb_id)
    ).set(data)
    return data


@router.delete("/{list_name}/{media_type}/{tmdb_id}", status_code=204)
def remove_item(
    list_name: ListName,
    media_type: MediaType,
    tmdb_id: int,
    user: dict = Depends(current_user),
):
    get_db().collection("saved_items").document(
        _doc_id(user["uid"], list_name, media_type, tmdb_id)
    ).delete()
