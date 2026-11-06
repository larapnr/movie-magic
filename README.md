# Movie Magic

A website for discovering movies and TV shows, viewing details, writing reviews, giving ratings, and saving favorites. Movie data comes from The Movie Database (TMDb) API.

**Stack:** React (Vite) + Tailwind CSS, Python FastAPI, Firebase Authentication, Cloud Firestore.

> **Firebase is optional for local development.** Without it the app runs in **local mode**: accounts, reviews and lists are stored in a SQLite file by the backend. See [Local mode (no Firebase)](#local-mode-no-firebase).

## Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the app](#running-the-app)
- [Project structure](#project-structure)
- [API](#api)
- [Database](#database)
- [Data model (Firestore)](#data-model-firestore)
- [Team workflow](#team-workflow)
- [Testing checklist](#testing-checklist)
- [Project plan](#project-plan)
- [Known gaps](#known-gaps)
- [Troubleshooting](#troubleshooting)
- [Commit history](#commit-history)

## Features

### Core

- Search movies and TV shows by title.
- Browse by genre and release year.
- Browse trending content, popular shows, and upcoming movies.
- View summaries, cast, crew, TMDb ratings, trailers, and where to watch.
- Create an account and sign in (email/password or Google).
- Rate titles from 1 to 5 stars and write an optional review. One review per user per title, editable and deletable by its author.
- Save titles to Favorites, Watchlist, or Watched.
- "YOLO" page: get a random title with its trailer.
- Recommendations based on genre and on the genres of your saved titles.

### Optional: Scene Finder (scene level trailer search)

Search for a moment using a text description, for example "car chase in the rain". It will first search 2 to 3 selected trailers, not full movies, then return a matching timestamp and play that part of the trailer. The backend route exists as a placeholder and returns `501` until the prototype is integrated.

## Prerequisites

Install these before you start:

| Tool | Version | Check with |
| --- | --- | --- |
| Git | any recent | `git --version` |
| Python | 3.10 or newer | `python3 --version` |
| Node.js | 20 or newer (Tailwind CSS 4's native build needs it) | `node --version` |
| npm | comes with Node | `npm --version` |

You also need:

- A **TMDb account** with an API key.
- Optional: access to the team's **Firebase project**, or your own. Not needed in local mode.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/larapnr/movie-magic.git
cd movie-magic
```

### 2. Get a TMDb API key

1. Sign up at https://www.themoviedb.org/signup.
2. Go to **Settings > API** (https://www.themoviedb.org/settings/api) and request an API key.
3. Copy either the **API Key** (short, v3) or the **API Read Access Token** (long, v4). The backend accepts both.

### 3. Set up Firebase (optional)

Skip this step to use [local mode](#local-mode-no-firebase).

If the team already has a Firebase project, ask the project owner to add you, then skip to the parts you need.

1. Create a project at https://console.firebase.google.com.
2. **Authentication:** go to Build > Authentication > Sign-in method and enable **Email/Password** and **Google**.
3. **Firestore:** go to Build > Firestore Database and create a database. The backend creates the `reviews` and `saved_items` collections automatically.
4. **Web app config (frontend):** go to Project settings > General > Your apps, add a Web app, and copy the `firebaseConfig` values.
5. **Service account (backend):** go to Project settings > Service accounts > Generate new private key. Save the downloaded file as `backend/serviceAccountKey.json`.

> The service account key gives full admin access to the Firebase project. Never commit it or share it in chat. `.gitignore` already excludes `serviceAccountKey.json` and `*-firebase-adminsdk-*.json`.

### 4. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
```

Open `backend/.env` and fill it in:

| Variable | What to put | Example |
| --- | --- | --- |
| `TMDB_API_KEY` | Your TMDb v3 key or v4 read access token | `abc123...` |
| `FIREBASE_SERVICE_ACCOUNT` | Path to the service account file, or the raw JSON string | `./serviceAccountKey.json` |
| `ALLOWED_ORIGINS` | Comma separated frontend URLs allowed by CORS | `http://localhost:5173` |
| `CACHE_TTL_SECONDS` | How long to cache TMDb responses | `300` |
| `AUTH_MODE` | `auto` (default), `firebase` or `local` | `auto` |
| `LOCAL_DB_PATH` | SQLite file used in local mode | `./movie_magic.db` |
| `AUTH_SECRET` | Optional secret for local login tokens. Empty = generated and stored in the DB | |

### 5. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # Windows: copy .env.example .env
```

Open `frontend/.env`. Leave the `VITE_FIREBASE_*` values empty for local mode, or fill them in with the Firebase web config from step 3.4:

| Variable | Firebase config field |
| --- | --- |
| `VITE_API_URL` | Backend URL, `http://localhost:8000` locally |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

## Local mode (no Firebase)

Every feature works without Firebase:

- **Backend:** with `AUTH_MODE=auto`, the backend uses Firebase only when `FIREBASE_SERVICE_ACCOUNT` is raw JSON or points to a file that exists. Otherwise it uses local mode: email/password accounts (PBKDF2 hashed passwords, HMAC signed tokens), reviews and lists go into the SQLite file at `LOCAL_DB_PATH`. `GET /api/auth/mode` shows which mode is active.
- **Frontend:** uses Firebase sign-in only when `VITE_FIREBASE_API_KEY` is set, otherwise local sign-in through `/api/auth/*`. Google sign-in is only offered with Firebase.
- Frontend and backend must use the same mode. Configure Firebase in both or in neither.
- Local data lives only in `backend/movie_magic.db` (gitignored). Delete the file to start fresh.

## Running the app

Run the backend and frontend in two separate terminals.

**Terminal 1, backend:**

```bash
cd backend
source .venv/bin/activate        # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

- Health check: http://localhost:8000/api/health should return `{"status": "ok"}`.
- Interactive API docs: http://localhost:8000/docs. Use these to test routes before the frontend is ready.

**Terminal 2, frontend:**

```bash
cd frontend
nvm use 20                       # if your default Node is older
npm run dev
```

The app opens at http://localhost:5173.

**Backend tests:**

```bash
cd backend
pytest
```

The tests do not need TMDb or Firebase credentials. `tests/test_local_mode.py` covers local accounts, reviews, lists and recommendations against a temporary SQLite file.

**Frontend production build:**

```bash
cd frontend
npm run build      # outputs to frontend/dist
npm run preview    # serves the build locally
```

## Project structure

```
movie-magic/
  frontend/                 React + Vite frontend
    src/
      api/client.js         Axios client, one function per endpoint, attaches the auth token
      components/           Navbar, Footer, MediaCard, MediaRow (row + grid), Reviews, ProtectedRoute, ui (stars, buttons, skeletons)
      context/              AuthContext (Firebase or local sign-in), ToastContext
      hooks.js              useGenres, useLists and small helpers
      pages/                Home, Browse, Search, Detail, Login, MyLists, Yolo, SceneFinder, NotFound
      mocks/                Saved JSON responses for building before the backend is ready
      firebase.js           Firebase web app setup (skipped when VITE_FIREBASE_API_KEY is empty)
  backend/                  FastAPI backend
    app/
      main.py               App, CORS, rate limiting (120 requests/minute per IP), router registration
      config.py             Settings from environment variables
      auth.py               Token verification dependency (Firebase ID token or local token)
      db.py                 Firebase Admin and Firestore setup
      store.py              Storage layer: FirestoreStore or SqliteStore (local mode)
      local_auth.py         Local mode password hashing and signed tokens
      models.py             Request models and enums
      services/             tmdb.py (cached TMDb client), cache.py
      routers/              account (local sign-in), search, details, trending, yolo, reviews,
                            favorites, recommendations, trailer_search
    tests/                  pytest tests
  docs/API_CONTRACT.md      Endpoints and response shapes
```

### Frontend routes

| Path | Page | Sign-in needed |
| --- | --- | --- |
| `/` | Home: hero, trending (today/week), popular (movies/TV), coming soon, top rated by genre, "For you" row | No |
| `/browse` | Discover with genre, year and sort filters, load more | No |
| `/search` | Search with All/Movies/TV tabs, load more | No |
| `/:mediaType/:id` | Title details (`/movie/603`, `/tv/1399`): cast, crew, trailer, where to watch, list buttons, community reviews | No (saving and reviewing need sign-in) |
| `/yolo` | Random title with trailer, by type and genre | No |
| `/scene-finder` | Scene level trailer search (shows "coming soon" while the backend returns 501) | No |
| `/login` | Sign up and sign in | No |
| `/my-lists` | Favorites, watchlist, watched, and "For you" recommendations | Yes |

## API

The full list of endpoints and response shapes is in [docs/API_CONTRACT.md](docs/API_CONTRACT.md). It is the source of truth. Update it before you change an endpoint.

Summary:

- **Public:** health, search, discover, genres, title details, trending, popular, upcoming, yolo, reviews for a title, review summary, genre recommendations, trailer search (placeholder).
- **Protected** (header `Authorization: Bearer <Firebase ID token>`): create, update, or delete your own review; read, add, or remove items in your lists; personal recommendations.
- **Errors:** `401` missing or invalid token, `404` not found, `422` invalid input, `502` TMDb error.

Responses for TMDb backed endpoints pass the TMDb JSON through unchanged.

## Database

With Firebase configured, the app uses **Google Cloud Firestore** for its data, as described below. In [local mode](#local-mode-no-firebase), the same records are stored in a SQLite file (`backend/movie_magic.db`, tables `users`, `reviews`, `saved_items`) with the same fields.

| What | Where it is stored |
| --- | --- |
| User accounts (email, password, Google sign-in) | Firebase Authentication |
| Reviews and ratings | Firestore collection `reviews` |
| Favorites, watchlist, watched | Firestore collection `saved_items` |
| Movie and TV data | Not stored. Fetched live from the TMDb API. |
| TMDb responses | Cached in the backend's memory for `CACHE_TTL_SECONDS` (default 300). Cleared when the backend restarts. |

How it connects:

- Only the backend talks to Firestore, through the Firebase Admin SDK ([backend/app/db.py](backend/app/db.py)). The frontend never reads or writes Firestore directly.
- The backend logs in with the service account set in `FIREBASE_SERVICE_ACCOUNT`.
- When run locally, the backend still reads and writes the real cloud Firestore database of whichever Firebase project that service account belongs to. If the whole team uses the shared project's key, everyone shares the same data. Use your own Firebase project if you want separate test data.
- Collections are created automatically on the first write. You don't need to run migrations or set up a schema.
- To see the data, open the Firebase console > Build > Firestore Database.

## Data model (Firestore)

- `reviews`: doc id `{uid}_{media_type}_{tmdb_id}`, so there is one review per user per title. Fields: uid, display_name, tmdb_id, media_type, rating (1 to 5), text, created_at, updated_at.
- `saved_items`: doc id `{uid}_{list}_{media_type}_{tmdb_id}`. Fields: uid, list (favorite, watchlist, watched), media_type, tmdb_id, title, poster_path, genre_ids, added_at.

### Shared data rules

- Always identify a title by both its TMDb id and its media type (`movie` or `tv`).
- Keep TMDb ratings and our community ratings separate, and label them separately in the UI.
- User ratings are whole numbers from 1 to 5. Review text is optional.
- The backend identifies the user from the verified Firebase token, never from a user id sent by the browser.
- Only the owner can change their reviews and lists. Published reviews are readable by everyone.
- Agree on format changes with the team before implementing them.

## Team workflow

1. Pull the latest `main` before starting: `git checkout main && git pull`.
2. Create a branch for your task: `git checkout -b feature/short-name`.
3. Write and test your changes.
4. Commit and push your branch: `git push -u origin feature/short-name`.
5. Open a pull request on GitHub.
6. Ask a teammate to review before merging. `main` must always stay deployable.

Working agreements:

- Every task has an owner, a deadline, and a clear deliverable.
- Everyone tests their own work and another person's feature.
- Secrets stay in `.env` files and hosting dashboards. Never commit API tokens, passwords, or service account keys.
- Change an endpoint shape only after updating `docs/API_CONTRACT.md`.
- The TMDb attribution in the footer must stay. TMDb requires it.

## Testing checklist

- Search finds movies and TV shows.
- Genre and year filters work.
- Detail pages display the correct title.
- Missing posters or trailers do not break the page.
- Sign-up, sign-in, and sign-out work.
- Ratings and reviews save and remain after reloading.
- Users cannot edit another person's review.
- Favorites, watchlist, and watched items can be added and removed.
- The layout works on desktop and mobile.
- Loading, empty results, and errors are handled.
- The deployed website works on another person's computer.

## Project plan

### Timeline

- Weeks 1 to 2: explore TMDb, set up GitHub and Firebase, plan the database, agree on JSON formats.
- Week 3: build and test backend search and filters.
- Week 4: demonstrate backend search and movie details.
- Weeks 5 to 6: build the frontend, connect it, add login and reviews.
- Week 7: finish ratings, reviews, and favorites. Test complete flows.
- Week 8: deploy, test, and prepare a backup demo recording.
- Week 9: final presentation.

Scene Finder is optional and comes after the core features work.

### Feature areas and owners

Add each person's name before starting.

| Area | Backend | Frontend | Owner |
| --- | --- | --- | --- |
| 1. App foundation | config, tmdb service, cache, CORS, deployment | layout, routing, API client | |
| 2. Discovery and search | search, discover, details, trending | Home, Search, Detail | |
| 3. Accounts and personal features | auth, reviews, favorites, watchlist, watched | Login, MyLists, review UI | |
| 4. Recommendations | recommendations router | recommendation rows, "For you" tab | Lara |
| 5. Scene level trailer search | trailer_search router (placeholder) | search UI with timestamped embed | |

## Known gaps

- Scene level trailer search returns `501` until the prototype is integrated. The frontend page is ready for the planned response shape.
- Sentiment based recommendations are not started. Genre based and activity based baselines exist.
- The footer uses a text TMDB badge. Swap in the official TMDb logo file (see https://www.themoviedb.org/about/logos-attribution).
- Local mode has no password reset or Google sign-in.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `502 TMDb error` from the backend | Check `TMDB_API_KEY` in `backend/.env`, then restart uvicorn. |
| `401` on protected routes | Sign in first. The frontend sends the token automatically. Check that the frontend and backend use the same Firebase project. |
| CORS error in the browser console | Add the frontend URL to `ALLOWED_ORIGINS` in `backend/.env` and restart the backend. |
| Firebase `auth/invalid-api-key` or a blank page | Check the `VITE_FIREBASE_*` values in `frontend/.env`, then restart `npm run dev`. Vite only reads `.env` at startup. |
| `Could not load the default credentials` | `FIREBASE_SERVICE_ACCOUNT` is empty or points to a missing file. |
| Google sign-in popup fails | Enable Google in Firebase Authentication, and add your domain under Authentication > Settings > Authorized domains. |
| `uvicorn: command not found` | Activate the virtual environment first: `source .venv/bin/activate`. |

## Commit history

Earlier commits on `main`, newest first:

| Commit | Author | Date | Summary |
| --- | --- | --- | --- |
| `1da828f` | Upasana | 2026-11-04 | Add backend and frontend app code with API contract. Added the FastAPI backend (routers, TMDb client, Firebase auth, tests), the React + Vite frontend (pages, components, auth context, API client), `docs/API_CONTRACT.md`, and `.gitignore`. Merged the per-folder READMEs into the root README. |
| `0d2f686` | larapnr | 2026-10-12 | Add project folders and README documentation. Wrote the project plan, feature list, team workflow, proposed routes, data formats, and the `backend/`, `frontend/`, and `docs/` READMEs. |
| `8aec2d6` | larapnr | 2026-10-12 | Create .DS_Store. A macOS system file, now ignored by `.gitignore`. |
| `2c054a1` | larapnr | 2026-10-12 | Initial commit. Created the repository with `README.md` and `.gitattributes`. |

Run `git log --stat` to see the full history.
