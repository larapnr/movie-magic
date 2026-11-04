from cachetools import TTLCache

from ..config import settings

# In-memory cache for TMDb responses. Swap for Redis later if the backend runs on several instances.
cache: TTLCache = TTLCache(maxsize=1024, ttl=settings.cache_ttl_seconds)
