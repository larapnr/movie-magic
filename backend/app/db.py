import json

import firebase_admin
from firebase_admin import credentials, firestore

from .config import settings

_app = None


def init_firebase():
    """Initialise the Firebase Admin app once (lazy, so tests can import the app without credentials)."""
    global _app
    if _app is not None:
        return _app
    sa = settings.firebase_service_account.strip()
    if sa.startswith("{"):
        cred = credentials.Certificate(json.loads(sa))
    elif sa:
        cred = credentials.Certificate(sa)
    else:
        cred = credentials.ApplicationDefault()
    _app = firebase_admin.initialize_app(cred)
    return _app


def get_db():
    init_firebase()
    return firestore.client()
