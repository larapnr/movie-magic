# API Contract

Base URL (local): http://localhost:8000
Responses for TMDb backed endpoints pass the TMDb JSON through unchanged.
Protected endpoints need the header `Authorization: Bearer <token>`: a Firebase ID token, or in local mode (no Firebase) the token returned by `/api/auth/login` or `/api/auth/signup`.

## Public

| Method | Path | Query | Notes |
| --- | --- | --- | --- |
| GET | /api/health | | `{"status": "ok"}` |
| GET | /api/search | q, type (multi, movie, tv), page | Title search |
| GET | /api/discover | type, genre (comma ids), year, sort_by, page | Filters. `vote_average.*` sorts only include titles with 200+ votes |
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

## Accounts (local mode)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | /api/auth/mode | | `{"mode": "local"}` or `{"mode": "firebase"}` |
| POST | /api/auth/signup | `{email, password (6+ chars), display_name?}` | 201 `{token, user}`. 409 if the email exists. 400 in Firebase mode |
| POST | /api/auth/login | `{email, password}` | `{token, user}`. 401 wrong email or password. 400 in Firebase mode |
| GET | /api/auth/me | | Protected. `{uid, email, display_name}` |

`user` is `{uid, email, display_name}`. Tokens expire after `AUTH_TOKEN_DAYS` (default 30).

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
