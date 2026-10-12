# Backend

The backend receives requests from the website, fetches movie
information from TMDb, and returns JSON responses.

## Planned technology
Python with FastAPI.

## Responsibilities
- Search for movie and TV titles.
- Browse by genre and release date.
- Fetch trending content, popular shows, and upcoming movies.
- Fetch title details, cast, crew, and trailer information.
- Verify Firebase login for protected backend actions.
- Support saving ratings, reviews, and favorites to Firestore.

## Proposed routes
These are our own routes, not TMDb's endpoint addresses.

- GET /api/search?query=Inception&type=movie
- GET /api/discover?type=movie&genreId=28&year=2020
- GET /api/browse?list=trending&type=movie
- GET /api/titles/movie/{id}
- GET /api/titles/tv/{id}

Routes for reviews and favorites will be agreed on before implementation.

## Data rules
- Return JSON using the formats in docs/README.md.
- Store both titleId and mediaType when identifying a title.
- Keep TMDb ratings separate from our app's community ratings.
- Identify users from verified login, not a userId supplied by the browser.

## Credentials
Keep the TMDb token in a backend .env file.
Exclude .env and private Firebase credentials from Git.

## Testing
Before the frontend exists, test routes using FastAPI's /docs page.
Check valid searches, empty results, invalid inputs, and API failures.

## Optional Scene Finder
After the core app works, add trailer indexing and timestamp search.