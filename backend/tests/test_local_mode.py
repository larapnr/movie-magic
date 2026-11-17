"""Local mode (no Firebase): accounts, reviews, lists and recommendations against a temp SQLite file."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers import recommendations
from app.store import get_store


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "local")
    monkeypatch.setattr(settings, "local_db_path", str(tmp_path / "test.db"))
    get_store.cache_clear()
    yield TestClient(app)
    get_store.cache_clear()


def signup(client, email="ana@example.com", name="Ana"):
    resp = client.post("/api/auth/signup", json={"email": email, "password": "secret123", "display_name": name})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def test_mode_is_local(client):
    assert client.get("/api/auth/mode").json() == {"mode": "local"}


def test_signup_login_me(client):
    signup(client)
    assert client.post("/api/auth/signup", json={"email": "ANA@example.com", "password": "secret123"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "ana@example.com", "password": "wrong!!"}).status_code == 401

    resp = client.post("/api/auth/login", json={"email": "Ana@Example.com", "password": "secret123"})
    assert resp.status_code == 200
    token = resp.json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "ana@example.com" and me["display_name"] == "Ana"


def test_tampered_token_rejected(client):
    headers = signup(client)
    headers["Authorization"] = headers["Authorization"][:-2] + "xx"
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_reviews_flow(client):
    ana = signup(client)
    ben = signup(client, "ben@example.com", "Ben")

    assert client.put("/api/reviews/movie/603", json={"rating": 5, "text": "Great"}).status_code == 401
    assert client.put("/api/reviews/movie/603", json={"rating": 9}, headers=ana).status_code == 422

    first = client.put("/api/reviews/movie/603", json={"rating": 5, "text": "Great"}, headers=ana).json()
    assert first["display_name"] == "Ana"
    client.put("/api/reviews/movie/603", json={"rating": 3}, headers=ben)
    edited = client.put("/api/reviews/movie/603", json={"rating": 4, "text": "Good"}, headers=ana).json()
    assert edited["created_at"] == first["created_at"]

    reviews = client.get("/api/reviews/movie/603").json()
    assert len(reviews) == 2
    assert client.get("/api/reviews/movie/603/summary").json() == {"average": 3.5, "count": 2}
    assert client.get("/api/reviews/tv/603").json() == []

    assert client.delete("/api/reviews/movie/603", headers=ben).status_code == 204
    assert client.delete("/api/reviews/movie/603", headers=ben).status_code == 404
    assert [r["display_name"] for r in client.get("/api/reviews/movie/603").json()] == ["Ana"]


def test_lists_and_recommendations(client, monkeypatch):
    ana = signup(client)
    assert client.get("/api/recommendations/me", headers=ana).status_code == 404

    item = {"title": "The Matrix", "poster_path": "/p.jpg", "genre_ids": [28, 878]}
    client.put("/api/me/lists/favorite/movie/603", json=item, headers=ana)
    client.put("/api/me/lists/watchlist/tv/1399", json={"title": "GoT", "genre_ids": [18]}, headers=ana)

    favs = client.get("/api/me/lists/favorite", headers=ana).json()
    assert [(i["tmdb_id"], i["list"], i["genre_ids"]) for i in favs] == [(603, "favorite", [28, 878])]

    other = signup(client, "ben@example.com", "Ben")
    assert client.get("/api/me/lists/favorite", headers=other).json() == []

    calls = []

    async def fake_tmdb(path, params=None):
        calls.append((path, params))
        return {"results": [{"id": 603}, {"id": 604}]}

    monkeypatch.setattr(recommendations, "tmdb_get", fake_tmdb)
    recs = client.get("/api/recommendations/me", headers=ana).json()
    assert [r["id"] for r in recs["results"]] == [604]  # already saved titles are filtered out
    discover = next(p for path, p in calls if path.startswith("/discover"))
    assert set(discover["with_genres"].split("|")) <= {"28", "878", "18"}

    assert client.delete("/api/me/lists/favorite/movie/603", headers=ana).status_code == 204
    assert client.get("/api/me/lists/favorite", headers=ana).json() == []
