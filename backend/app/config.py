from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    tmdb_api_key: str = ""
    firebase_service_account: str = ""
    allowed_origins: str = "http://localhost:5173"
    cache_ttl_seconds: int = 300

    # auth_mode: "auto" (default), "firebase" or "local".
    #   auto     -> Firebase when FIREBASE_SERVICE_ACCOUNT is raw JSON or points to an existing file,
    #               otherwise local mode.
    #   firebase -> always Firebase (also allows Application Default Credentials on hosted platforms).
    #   local    -> no Firebase at all: accounts, reviews and lists live in a local SQLite file.
    auth_mode: str = "auto"
    local_db_path: str = "./movie_magic.db"
    # Secret used to sign local-mode login tokens. Leave empty to auto-generate one stored in the DB.
    auth_secret: str = ""
    auth_token_days: int = 30

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def use_firebase(self) -> bool:
        mode = self.auth_mode.strip().lower()
        if mode == "firebase":
            return True
        if mode == "local":
            return False
        sa = self.firebase_service_account.strip()
        return sa.startswith("{") or (bool(sa) and Path(sa).is_file())


settings = Settings()
