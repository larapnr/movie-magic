from fastapi import APIRouter, Depends

from ..auth import current_user
from ..models import ListName, MediaType, SavedItemIn
from ..store import get_store, now_iso

router = APIRouter(prefix="/api/me/lists", tags=["lists"])


@router.get("/{list_name}")
def get_list(list_name: ListName, user: dict = Depends(current_user)):
    """list_name is one of: favorite, watchlist, watched."""
    return get_store().saved_items(user["uid"], list_name.value)


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
        "added_at": now_iso(),
    }
    get_store().put_item(data)
    return data


@router.delete("/{list_name}/{media_type}/{tmdb_id}", status_code=204)
def remove_item(
    list_name: ListName,
    media_type: MediaType,
    tmdb_id: int,
    user: dict = Depends(current_user),
):
    get_store().delete_item(user["uid"], list_name.value, media_type.value, tmdb_id)
