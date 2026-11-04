import httpx
from fastapi import HTTPException

from ..config import settings
from .cache import cache

BASE_URL = "https://api.themoviedb.org/3"


async def tmdb_get(path: str, params: dict | None = None) -> dict:
    """GET a TMDb v3 endpoint with caching. Accepts either a v3 API key or a v4 read access token."""
    clean = {k: v for k, v in (params or {}).items() if v is not None}
    key = (path, tuple(sorted(clean.items())))
    if key in cache:
        return cache[key]

    headers = {}
    token = settings.tmdb_api_key
    if len(token) > 40:  # v4 read access token (JWT)
        headers["Authorization"] = f"Bearer {token}"
    else:
        clean["api_key"] = token

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        resp = await client.get(path, params=clean, headers=headers)

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Not found on TMDb")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"TMDb error {resp.status_code}")

    data = resp.json()
    cache[key] = data
    return data
