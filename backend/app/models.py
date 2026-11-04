from enum import Enum

from pydantic import BaseModel, Field


class MediaType(str, Enum):
    movie = "movie"
    tv = "tv"


class ListName(str, Enum):
    favorite = "favorite"
    watchlist = "watchlist"
    watched = "watched"


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(default="", max_length=2000)
    display_name: str | None = None


class SavedItemIn(BaseModel):
    title: str
    poster_path: str | None = None
    genre_ids: list[int] = []
