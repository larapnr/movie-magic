from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_protected_route_requires_token():
    resp = client.get("/api/me/lists/favorite")
    assert resp.status_code == 401


def test_trailer_search_is_placeholder():
    resp = client.get("/api/trailer-search", params={"q": "car chase"})
    assert resp.status_code == 501
