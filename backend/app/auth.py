from fastapi import Header, HTTPException
from firebase_admin import auth as fb_auth

from .db import init_firebase


def current_user(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency. Verifies the Firebase ID token sent as 'Authorization: Bearer <token>'."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    init_firebase()
    try:
        decoded = fb_auth.verify_id_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"uid": decoded["uid"], "email": decoded.get("email")}
