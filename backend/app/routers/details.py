from fastapi import APIRouter

from ..models import MediaType
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api/media", tags=["details"])


@router.get("/{media_type}/{tmdb_id}")
async def details(media_type: MediaType, tmdb_id: int):
    """Details with cast, crew, videos, watch providers and similar titles in one call."""
    return await tmdb_get(
        f"/{media_type.value}/{tmdb_id}",
        {"append_to_response": "credits,videos,watch/providers,recommendations"},
    )
