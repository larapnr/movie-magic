# API Contract

Base URL (local): http://localhost:8000
Responses for TMDb backed endpoints pass the TMDb JSON through unchanged.
Protected endpoints need the header `Authorization: Bearer <Firebase ID token>`.

## Public

| Method | Path | Query | Notes |
| --- | --- | --- | --- |
| GET | /api/health | | `{"status": "ok"}` |
| GET | /api/search | q, type (multi, movie, tv), page | Title search |
| GET | /api/discover | type, genre (comma ids), year, sort_by, page | Filters |
| GET | /api/genres | type | Genre id to name list |
| GET | /api/media/{movie or tv}/{id} | | Details with credits, videos, watch/providers, recommendations |
| GET | /api/trending | window (day, week) | Movies and TV |
| GET | /api/popular | type, page | |
| GET | /api/upcoming | page | Movies |
| GET | /api/yolo | type, genre | Random title plus `trailerKey` (YouTube) |
| GET | /api/reviews/{type}/{id} | | List reviews, newest first |
| GET | /api/reviews/{type}/{id}/summary | | `{"average": 4.2, "count": 7}` |
| GET | /api/recommendations/genre | genre, type | Genre based suggestions |
| GET | /api/trailer-search | q | Returns 501 until implemented |

## Protected

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| PUT | /api/reviews/{type}/{id} | `{rating 1-5, text, display_name?}` | Create or update own review |
| DELETE | /api/reviews/{type}/{id} | | 204, deletes own review |
| GET | /api/me/lists/{favorite, watchlist, watched} | | Saved items, newest first |
| PUT | /api/me/lists/{list}/{type}/{id} | `{title, poster_path, genre_ids}` | Add to list |
| DELETE | /api/me/lists/{list}/{type}/{id} | | 204, remove from list |
| GET | /api/recommendations/me | type | Based on genres of saved items, 404 if nothing saved |

## Planned: scene level trailer search

`GET /api/trailer-search?q=car chase in the rain`

```
{
  "query": "car chase in the rain",
  "matches": [
    {
      "tmdb_id": 603,
      "media_type": "movie",
      "title": "...",
      "youtube_key": "...",
      "start_seconds": 42,
      "end_seconds": 51,
      "score": 0.83
    }
  ]
}
```

The shape is a proposal. Adjust it to what the prototype can return, then update this file.

## Errors

- 401 missing or invalid token
- 404 not found
- 422 invalid input (FastAPI validation)
- 502 TMDb error
