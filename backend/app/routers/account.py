from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import current_user
from ..config import settings
from ..local_auth import create_token, hash_password, verify_password
from ..store import get_store

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignupIn(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=254)
    password: str = Field(min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=50)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


def _public(user: dict) -> dict:
    return {"uid": user["uid"], "email": user["email"], "display_name": user["display_name"]}


def _require_local():
    if settings.use_firebase:
        raise HTTPException(status_code=400, detail="This server uses Firebase sign-in")


@router.get("/mode")
def mode():
    """Which sign-in system the backend expects: "firebase" or "local"."""
    return {"mode": "firebase" if settings.use_firebase else "local"}


@router.post("/signup", status_code=201)
def signup(body: SignupIn):
    _require_local()
    email = body.email.strip().lower()
    name = (body.display_name or "").strip() or email.split("@")[0]
    user = get_store().create_user(email, name, hash_password(body.password))
    if user is None:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    return {"token": create_token(user), "user": _public(user)}


@router.post("/login")
def login(body: LoginIn):
    _require_local()
    user = get_store().user_by_email(body.email.strip().lower())
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"token": create_token(user), "user": _public(user)}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return {"uid": user["uid"], "email": user["email"], "display_name": user.get("name")}
