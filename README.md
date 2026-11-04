# Movie Magic

Web app to discover, browse and review movies and TV shows using The Movie Database (TMDb) API.

Stack: React (Vite) + Tailwind, FastAPI, Firebase Auth, Firestore.

## Structure

```
movie-magic/
  frontend/                 React + Vite frontend
    src/
      api/client.js       Axios client and one function per endpoint
      components/         Navbar, Footer, MediaCard, MediaRow, ProtectedRoute
      context/            AuthContext (Firebase Auth)
      pages/              Home, Search, Detail, Login, MyLists, Yolo
      mocks/              Saved JSON responses for building before the backend is ready
  backend/                 FastAPI backend
    app/
      main.py             App, CORS, rate limiting, router registration
      config.py           Settings from environment variables
      auth.py             Firebase ID token verification dependency
      db.py               Firebase Admin and Firestore setup
      models.py           Request models and enums
      services/           tmdb.py (cached TMDb client), cache.py
      routers/            search, details, trending, yolo, reviews, favorites,
                          recommendations, trailer_search
    tests/
  docs/API_CONTRACT.md    Endpoints and response shapes
```

## Setup

Backend:

```
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in TMDB_API_KEY and FIREBASE_SERVICE_ACCOUNT
uvicorn app.main:app --reload --port 8000
```

API docs open at http://localhost:8000/docs. Run tests with `pytest`.

Frontend:

```
cd frontend
npm install
cp .env.example .env             # fill in the Firebase web config
npm run dev
```

The app opens at http://localhost:5173.

## Feature areas

| Area | Backend | Frontend | Owner |
| --- | --- | --- | --- |
| 1. App foundation | config, tmdb service, cache, CORS, deployment | layout, routing, API client | |
| 2. Discovery and search | search, discover, details, trending | Home, Search, Detail | |
| 3. Accounts and personal features | auth, reviews, favorites, watchlist, watched | Login, MyLists, review UI | |
| 4. Recommendations | recommendations router | recommendation rows, "For you" tab | |
| 5. Scene level trailer search | trailer_search router (placeholder) | search UI with timestamped embed | |

## Data model (Firestore)

- `reviews`: doc id `{uid}_{media_type}_{tmdb_id}` (one review per user per title). Fields: uid, display_name, tmdb_id, media_type, rating (1 to 5), text, created_at, updated_at.
- `saved_items`: doc id `{uid}_{list}_{media_type}_{tmdb_id}`. Fields: uid, list (favorite, watchlist, watched), media_type, tmdb_id, title, poster_path, genre_ids, added_at.

## Working agreements

- Branch per feature, pull request reviewed by one other person, main stays deployable.
- Secrets stay in `.env` files and hosting dashboards. Never commit them.
- Change an endpoint shape only after updating `docs/API_CONTRACT.md`.
- The TMDb attribution in the footer must stay.

## Known gaps

- Review UI on the detail page is a TODO.
- Search filters (genre, year) and pagination are a TODO. The backend `/api/discover` already supports them.
- Scene level trailer search returns 501 until the prototype is integrated.
- Sentiment based recommendations are not started. Genre based and activity based baselines exist.
