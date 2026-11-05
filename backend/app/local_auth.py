"""Email/password accounts for local mode, using only the standard library.

Passwords are hashed with PBKDF2-SHA256. Login tokens are HMAC-SHA256 signed
`<payload>.<signature>` strings (base64url) carrying uid, email, name and expiry.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time

from .config import settings
from .store import get_store

_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
    except ValueError:
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _secret() -> bytes:
    return (settings.auth_secret or get_store().secret()).encode()


def _sign(payload: str) -> str:
    return _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())


def create_token(user: dict) -> str:
    claims = {
        "uid": user["uid"],
        "email": user["email"],
        "name": user["display_name"],
        "exp": int(time.time()) + settings.auth_token_days * 86400,
    }
    payload = _b64(json.dumps(claims, separators=(",", ":")).encode())
    return f"{payload}.{_sign(payload)}"


def verify_token(token: str) -> dict | None:
    try:
        payload, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload)):
            return None
        claims = json.loads(_unb64(payload))
    except (ValueError, json.JSONDecodeError):
        return None
    if claims.get("exp", 0) < time.time():
        return None
    return claims
