"""Workstream 4: moods, review sentiment and personal recommendations (TMDb is faked)."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers import recommendations as rec
from app.store import get_store


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "local")
    monkeypatch.setattr(settings, "local_db_path", str(tmp_path / "test.db"))
    get_store.cache_clear()
    yield TestClient(app)
    get_store.cache_clear()


@pytest.fixture
def tmdb(monkeypatch):
    """Fake TMDb. Records every call; answers by path."""
    calls = []
    details = {603: {"title": "The Matrix", "genres": [{"id": 28}, {"id": 878}]},
               10: {"title": "Scary Thing", "genres": [{"id": 27}]}}

    async def fake(path, params=None):
        calls.append((path, params or {}))
        if path.endswith("/recommendations"):
            return {"results": [{"id": 604, "genre_ids": [28]}, {"id": 666, "genre_ids": [27]}]}
        if path.startswith("/discover"):
            return {"results": [{"id": 605, "genre_ids": [878]}, {"id": 603, "genre_ids": [28]}]}
        tid = int(path.rsplit("/", 1)[1])
        return details[tid]

    monkeypatch.setattr(rec, "tmdb_get", fake)
    return calls


def signup(client):
    r = client.post("/api/auth/signup", json={"email": "lara@example.com", "password": "secret123", "display_name": "Lara"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_sentiment():
    assert rec.sentiment("Loved it, amazing visuals") > 0
    assert rec.sentiment("boring and way too slow") < 0
    assert rec.sentiment("not good") < 0
    assert rec.sentiment("") == 0


def test_genre_mapping():
    assert rec.genre_for(28, "tv") == 10759  # Action -> Action & Adventure
    assert rec.genre_for(10765, "movie") == 878  # Sci-Fi & Fantasy -> Science Fiction
    assert rec.genre_for(27, "tv") is None  # TV has no horror genre
    assert rec.genre_for(35, "tv") == 35


def test_detect_mood():
    assert rec.detect_mood("I had a really long day at work") == "cozy"
    assert rec.detect_mood("I want something that makes me laugh") == "happy"
    assert rec.detect_mood("feeling sad after my breakup") == "emotional"
    assert rec.detect_mood("asdf") == "cozy"


def test_moods_list(client):
    keys = [m["key"] for m in client.get("/api/recommendations/moods").json()]
    assert "happy" in keys and "scared" in keys


def test_mood_endpoint(client, tmdb):
    data = client.get("/api/recommendations/mood", params={"mood": "scared", "type": "movie"}).json()
    assert data["mood"]["key"] == "scared"
    params = tmdb[-1][1]
    assert params["with_genres"] == "27|53" and "10751" in params["without_genres"]

    data = client.get("/api/recommendations/mood", params={"feeling": "I need a good laugh", "type": "tv"}).json()
    assert data["mood"]["key"] == "happy"
    assert tmdb[-1][0] == "/discover/tv"

    assert client.get("/api/recommendations/mood").status_code == 422
    assert client.get("/api/recommendations/mood", params={"mood": "nope"}).status_code == 422


def test_me_needs_activity(client, tmdb):
    assert client.get("/api/recommendations/me", headers=signup(client)).status_code == 404


def test_me_uses_reviews_and_avoids_disliked_genres(client, tmdb):
    me = signup(client)
    # Loved The Matrix (only reviewed, never saved), hated a horror film.
    client.put("/api/reviews/movie/603", json={"rating": 5, "text": "Amazing, loved it"}, headers=me)
    client.put("/api/reviews/movie/10", json={"rating": 1, "text": "boring and awful"}, headers=me)

    data = client.get("/api/recommendations/me", headers=me).json()
    ids = [r["id"] for r in data["results"]]

    assert 603 not in ids  # already reviewed
    assert 666 not in ids  # horror, which the user disliked
    assert ids == [604, 605]
    assert data["results"][0]["reason"] == "Because you liked The Matrix"
    assert data["results"][1]["reason"] == "From genres you like"
    assert set(data["based_on"]["liked_genres"]) == {28, 878}
    assert data["based_on"]["avoided_genres"] == [27]

    discover = next(p for path, p in tmdb if path.startswith("/discover"))
    assert discover["without_genres"] == "27"
