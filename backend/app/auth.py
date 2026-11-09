from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

bearer_scheme = HTTPBearer()

def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """FastAPI dependency. Verifies 'Authorization: Bearer <token>'.

    Firebase mode: the token is a Firebase ID token.
    Local mode: the token comes from POST /api/auth/login or /api/auth/signup.
    Returns {"uid", "email", "name"}.
    """
    token = credentials.credentials

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
