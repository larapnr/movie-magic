"""Storage for reviews, saved lists and (local mode only) user accounts.

Two interchangeable backends expose the same methods and return plain dicts with the
same fields as the Firestore documents described in the README:

- FirestoreStore: Cloud Firestore, used when Firebase is configured.
- SqliteStore: a local SQLite file, used in local mode (no Firebase needed).

Routers call get_store() and never touch a database directly.
"""

import json
import secrets
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from functools import lru_cache

from .config import settings


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class FirestoreStore:
    def _db(self):
        from .db import get_db

        return get_db()

    @staticmethod
    def _review_id(uid, media_type, tmdb_id):
        # One review per user per title: the id itself enforces it.
        return f"{uid}_{media_type}_{tmdb_id}"

    @staticmethod
    def _item_id(uid, list_name, media_type, tmdb_id):
        return f"{uid}_{list_name}_{media_type}_{tmdb_id}"

    def reviews_for_title(self, media_type: str, tmdb_id: int) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        docs = (
            self._db()
            .collection("reviews")
            .where(filter=FieldFilter("tmdb_id", "==", tmdb_id))
            .where(filter=FieldFilter("media_type", "==", media_type))
            .stream()
        )
        items = [d.to_dict() for d in docs]
        items.sort(key=lambda r: r["created_at"], reverse=True)
        return items

    def get_review(self, uid, media_type, tmdb_id) -> dict | None:
        snap = self._db().collection("reviews").document(self._review_id(uid, media_type, tmdb_id)).get()
        return snap.to_dict() if snap.exists else None

    def reviews_by_user(self, uid: str) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        docs = self._db().collection("reviews").where(filter=FieldFilter("uid", "==", uid)).stream()
        items = [d.to_dict() for d in docs]
        items.sort(key=lambda r: r["updated_at"], reverse=True)
        return items

    def put_review(self, data: dict) -> None:
        doc_id = self._review_id(data["uid"], data["media_type"], data["tmdb_id"])
        self._db().collection("reviews").document(doc_id).set(data)

    def delete_review(self, uid, media_type, tmdb_id) -> bool:
        ref = self._db().collection("reviews").document(self._review_id(uid, media_type, tmdb_id))
        if not ref.get().exists:
            return False
        ref.delete()
        return True

    def saved_items(self, uid: str, list_name: str | None = None) -> list[dict]:
        from google.cloud.firestore_v1.base_query import FieldFilter

        q = self._db().collection("saved_items").where(filter=FieldFilter("uid", "==", uid))
        if list_name:
            q = q.where(filter=FieldFilter("list", "==", list_name))
        items = [d.to_dict() for d in q.stream()]
        items.sort(key=lambda i: i["added_at"], reverse=True)
        return items

    def put_item(self, data: dict) -> None:
        doc_id = self._item_id(data["uid"], data["list"], data["media_type"], data["tmdb_id"])
        self._db().collection("saved_items").document(doc_id).set(data)

    def delete_item(self, uid, list_name, media_type, tmdb_id) -> None:
        self._db().collection("saved_items").document(
            self._item_id(uid, list_name, media_type, tmdb_id)
        ).delete()


class SqliteStore:
    SCHEMA = """
    CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
        uid TEXT NOT NULL,
        media_type TEXT NOT NULL,
        tmdb_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (uid, media_type, tmdb_id)
    );
    CREATE INDEX IF NOT EXISTS reviews_by_title ON reviews (media_type, tmdb_id);
    CREATE TABLE IF NOT EXISTS saved_items (
        uid TEXT NOT NULL,
        list_name TEXT NOT NULL,
        media_type TEXT NOT NULL,
        tmdb_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        genre_ids TEXT NOT NULL DEFAULT '[]',
        added_at TEXT NOT NULL,
        PRIMARY KEY (uid, list_name, media_type, tmdb_id)
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    """

    def __init__(self, path: str):
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock, self._conn:
            self._conn.executescript(self.SCHEMA)

    def _all(self, sql, args=()):
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, args).fetchall()]

    def _one(self, sql, args=()):
        rows = self._all(sql, args)
        return rows[0] if rows else None

    def _write(self, sql, args=()) -> int:
        with self._lock, self._conn:
            return self._conn.execute(sql, args).rowcount

    # Reviews

    def reviews_for_title(self, media_type, tmdb_id):
        return self._all(
            "SELECT * FROM reviews WHERE media_type = ? AND tmdb_id = ? ORDER BY created_at DESC",
            (media_type, tmdb_id),
        )

    def get_review(self, uid, media_type, tmdb_id):
        return self._one(
            "SELECT * FROM reviews WHERE uid = ? AND media_type = ? AND tmdb_id = ?",
            (uid, media_type, tmdb_id),
        )

    def reviews_by_user(self, uid):
        return self._all("SELECT * FROM reviews WHERE uid = ? ORDER BY updated_at DESC", (uid,))

    def put_review(self, data):
        self._write(
            """INSERT OR REPLACE INTO reviews
               (uid, media_type, tmdb_id, display_name, rating, text, created_at, updated_at)
               VALUES (:uid, :media_type, :tmdb_id, :display_name, :rating, :text, :created_at, :updated_at)""",
            data,
        )

    def delete_review(self, uid, media_type, tmdb_id):
        return (
            self._write(
                "DELETE FROM reviews WHERE uid = ? AND media_type = ? AND tmdb_id = ?",
                (uid, media_type, tmdb_id),
            )
            > 0
        )

    # Saved lists

    @staticmethod
    def _item_out(row):
        row["list"] = row.pop("list_name")
        row["genre_ids"] = json.loads(row["genre_ids"])
        return row

    def saved_items(self, uid, list_name=None):
        if list_name:
            rows = self._all(
                "SELECT * FROM saved_items WHERE uid = ? AND list_name = ? ORDER BY added_at DESC",
                (uid, list_name),
            )
        else:
            rows = self._all("SELECT * FROM saved_items WHERE uid = ? ORDER BY added_at DESC", (uid,))
        return [self._item_out(r) for r in rows]

    def put_item(self, data):
        self._write(
            """INSERT OR REPLACE INTO saved_items
               (uid, list_name, media_type, tmdb_id, title, poster_path, genre_ids, added_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data["uid"],
                data["list"],
                data["media_type"],
                data["tmdb_id"],
                data["title"],
                data["poster_path"],
                json.dumps(data["genre_ids"]),
                data["added_at"],
            ),
        )

    def delete_item(self, uid, list_name, media_type, tmdb_id):
        self._write(
            "DELETE FROM saved_items WHERE uid = ? AND list_name = ? AND media_type = ? AND tmdb_id = ?",
            (uid, list_name, media_type, tmdb_id),
        )

    # Local accounts (local mode only)

    def create_user(self, email: str, display_name: str, password_hash: str) -> dict | None:
        user = {
            "uid": uuid.uuid4().hex,
            "email": email,
            "display_name": display_name,
            "password_hash": password_hash,
            "created_at": now_iso(),
        }
        try:
            self._write(
                "INSERT INTO users (uid, email, display_name, password_hash, created_at) "
                "VALUES (:uid, :email, :display_name, :password_hash, :created_at)",
                user,
            )
        except sqlite3.IntegrityError:
            return None
        return user

    def user_by_email(self, email: str) -> dict | None:
        return self._one("SELECT * FROM users WHERE email = ?", (email,))

    def user_by_uid(self, uid: str) -> dict | None:
        return self._one("SELECT * FROM users WHERE uid = ?", (uid,))

    def secret(self) -> str:
        """Token signing secret, generated once and kept in the DB so logins survive restarts."""
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT OR IGNORE INTO meta (key, value) VALUES ('auth_secret', ?)",
                (secrets.token_hex(32),),
            )
            return self._conn.execute("SELECT value FROM meta WHERE key = 'auth_secret'").fetchone()[0]


@lru_cache
def get_store() -> FirestoreStore | SqliteStore:
    if settings.use_firebase:
        return FirestoreStore()
    return SqliteStore(settings.local_db_path)
