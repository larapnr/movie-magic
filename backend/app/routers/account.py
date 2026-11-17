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

class ProfileIn(BaseModel):
    bio: str = Field(default="", max_length=300)
    favorite_genres: list[int] = Field(default_factory=list, max_length=10)

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

@router.post("/friends/request/{uid}")
def send_friend_request(
    uid: str,
    user: dict = Depends(current_user)
):
    requester_uid = user["uid"]

    # Prevent sending a request to yourself
    if requester_uid == uid:
        raise HTTPException(
            status_code=400,
            detail="You cannot send a friend request to yourself"
        )

    # Check that the recipient exists
    recipient = get_store().user_by_uid(uid)

    if recipient is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Save the friend request
    created = get_store().send_friend_request(requester_uid, uid)

    if not created:
        raise HTTPException(
            status_code=409,
            detail="A friend request already exists"
        )

    return {"message": "Friend request sent"}

@router.get("/friends/requests/incoming")
def get_incoming_requests(user: dict = Depends(current_user)):
    store = get_store()
    requests = store.incoming_friend_requests(user["uid"])

    enriched_requests = []

    for request in requests:
        requester = store.user_by_uid(request["requester_uid"])

        enriched_requests.append({
            **request,
            "display_name": (
                requester.get("display_name") or requester.get("name")
                if requester else "Movie Magic User"
            )
        })

    return {"requests": enriched_requests}

@router.get("/friends/requests/outgoing")
def get_outgoing_requests(user: dict = Depends(current_user)):
    store = get_store()
    requests = store.outgoing_friend_requests(user["uid"])

    enriched_requests = []

    for request in requests:
        recipient = store.user_by_uid(request["receiver_uid"])

        enriched_requests.append({
            **request,
            "display_name": (
                recipient.get("display_name") or recipient.get("name")
                if recipient else "Movie Magic User"
            )
        })

    return {"requests": enriched_requests}

class FriendRequestResponse(BaseModel):
    accept: bool
@router.post("/friends/respond/{uid}")
def respond_to_friend_request(
    uid: str,
    body: FriendRequestResponse,
    user: dict = Depends(current_user)
):
    receiver_uid = user["uid"]

    updated = get_store().respond_to_friend_request(
        requester_uid=uid,
        receiver_uid=receiver_uid,
        accept=body.accept
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Pending friend request not found"
        )

    if body.accept:
        return {"message": "Friend request accepted"}

    return {"message": "Friend request declined"}

@router.get("/friends")
def get_friends(user: dict = Depends(current_user)):
    store = get_store()
    uid = user["uid"]
    friendships = store.friends(uid)

    enriched_friends = []

    for friendship in friendships:
        other_uid = (
            friendship["receiver_uid"]
            if friendship["requester_uid"] == uid
            else friendship["requester_uid"]
        )

        other_user = store.user_by_uid(other_uid)

        enriched_friends.append({
            **friendship,
            "friend_uid": other_uid,
            "display_name": (
                other_user.get("display_name") or other_user.get("name")
                if other_user else "Movie Magic User"
            )
        })

    return {"friends": enriched_friends}

@router.delete("/friends/{uid}")
def remove_friend(uid: str, user: dict = Depends(current_user)):
    removed = get_store().remove_friend(user["uid"], uid)

    if not removed:
        raise HTTPException(status_code=404, detail="Friendship not found")

    return {"message": "Friend removed"}

@router.get("/users/{uid}/profile")
def get_public_profile(uid: str):
    # Find the user account
    user = get_store().user_by_uid(uid)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Find the user's profile information
    profile = get_store().get_profile(uid)

    if profile is None:
        profile = {
            "bio": "",
            "favorite_genres": []
        }

    # Return only information safe for public viewing
    return {
        "uid": uid,
        "display_name": user.get("display_name") or user.get("name"),
        "bio": profile["bio"],
        "favorite_genres": profile["favorite_genres"]
    }

@router.get("/profile")
def get_profile(user: dict = Depends(current_user)):
    uid = user["uid"]

    profile = get_store().get_profile(uid)

    if profile is None:
        profile = {
            "bio": "",
            "favorite_genres": []
        }

    return {
        "uid": uid,
        "bio": profile["bio"],
        "favorite_genres": profile["favorite_genres"]
    }


@router.put("/profile")
def update_profile(
    body: ProfileIn,
    user: dict = Depends(current_user)
):
    uid = user["uid"]

    profile_data = {
        "bio": body.bio,
        "favorite_genres": body.favorite_genres
    }

    get_store().put_profile(uid, profile_data)

    return {
        "uid": uid,
        **profile_data
    }