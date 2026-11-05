from fastapi import Header, HTTPException

from .config import settings


def current_user(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency. Verifies 'Authorization: Bearer <token>'.

    Firebase mode: the token is a Firebase ID token.
    Local mode: the token comes from POST /api/auth/login or /api/auth/signup.
    Returns {"uid", "email", "name"}.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]

    if not settings.use_firebase:
        from .local_auth import verify_token

        claims = verify_token(token)
        if not claims:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return {"uid": claims["uid"], "email": claims.get("email"), "name": claims.get("name")}

    from firebase_admin import auth as fb_auth

    from .db import init_firebase

    init_firebase()
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"uid": decoded["uid"], "email": decoded.get("email"), "name": decoded.get("name")}
