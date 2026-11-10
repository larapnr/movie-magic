"""Recommendations (workstream 4).

Three kinds:
1. /genre  - top titles for one genre (no account needed).
2. /mood   - titles that fit a mood, picked from a list or typed as free text ("I had a long day").
3. /me     - personal picks from the user's lists AND reviews. Star ratings and the words in a
             review push genres up or down, disliked genres are excluded, and TMDb's
             "more like this" for the user's best-liked title is mixed in.
"""

import re
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from ..auth import current_user
from ..models import MediaType
from ..store import get_store
from ..services.tmdb import tmdb_get

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


# ---------------------------------------------------------------------------
# Genres: movie and TV use different ids for a few genres. Map between them.
# ---------------------------------------------------------------------------

MOVIE_TO_TV = {28: 10759, 12: 10759, 878: 10765, 14: 10765, 10752: 10768}
TV_TO_MOVIE = {10759: 28, 10765: 878, 10768: 10752}
SHARED = {16, 35, 80, 99, 18, 10751, 9648, 37}
MOVIE_ONLY = {27, 10749, 53, 36, 10402, 10770}  # no TV equivalent
TV_ONLY = {10762, 10763, 10764, 10766, 10767}  # no movie equivalent


def genre_for(genre_id: int, target: str) -> int | None:
    """Translate a genre id to the target media type ('movie' or 'tv'), or None if it has no match."""
    if genre_id in SHARED:
        return genre_id
    if target == "tv":
        if genre_id in MOVIE_TO_TV:
            return MOVIE_TO_TV[genre_id]
        return None if genre_id in MOVIE_ONLY else genre_id
    if genre_id in TV_TO_MOVIE:
        return TV_TO_MOVIE[genre_id]
    return None if genre_id in TV_ONLY else genre_id


@router.get("/genre")
async def by_genre(genre: str, type: MediaType = MediaType.movie):
    """Step 1: genre based suggestions (works without an account)."""
    return await tmdb_get(
        f"/discover/{type.value}",
        {"with_genres": genre, "sort_by": "vote_average.desc", "vote_count.gte": 300},
    )


# ---------------------------------------------------------------------------
# Moods / feelings
# ---------------------------------------------------------------------------

# Each mood: which genres to include (any of them) and which to leave out, per media type.
MOODS = {
    "happy": {
        "label": "Need a laugh", "emoji": "😂",
        "movie": {"with": [35, 16, 10751], "without": [27, 53, 10752]},
        "tv": {"with": [35, 16], "without": [80, 10768]},
        "words": ["laugh", "funny", "happy", "cheer", "silly", "lighthearted", "fun", "joke", "comedy", "bored"],
    },
    "cozy": {
        "label": "Cozy & comforting", "emoji": "🛋️",
        "movie": {"with": [10749, 10751, 35], "without": [27, 53, 80, 10752]},
        "tv": {"with": [35, 10751], "without": [80, 9648, 10768]},
        "words": ["cozy", "comfort", "relax", "tired", "exhausted", "long day", "rough day", "stressed",
                  "calm", "chill", "sick", "rainy", "warm", "unwind", "lazy", "sleepy"],
    },
    "excited": {
        "label": "Adrenaline", "emoji": "💥",
        "movie": {"with": [28, 12, 53], "without": [10749, 10751]},
        "tv": {"with": [10759], "without": [10751, 10766]},
        "words": ["action", "adrenaline", "excited", "pumped", "energy", "hyped", "thrill", "intense", "explosion", "fight"],
    },
    "emotional": {
        "label": "A good cry", "emoji": "😢",
        "movie": {"with": [18, 10749], "without": [35, 27, 28]},
        "tv": {"with": [18], "without": [35, 10759]},
        "words": ["sad", "cry", "heartbroken", "lonely", "breakup", "broke up", "miss", "emotional", "grief", "down", "depressed", "blue"],
    },
    "scared": {
        "label": "Spooky", "emoji": "👻",
        "movie": {"with": [27, 53], "without": [10751, 16]},
        "tv": {"with": [9648, 80], "without": [10751, 16]},
        "words": ["scary", "scared", "spooky", "horror", "creepy", "halloween", "fright", "dark", "ghost"],
    },
    "curious": {
        "label": "Make me think", "emoji": "🧠",
        "movie": {"with": [99, 878, 36, 9648], "without": [10751]},
        "tv": {"with": [99, 10765, 9648], "without": [10751]},
        "words": ["think", "curious", "learn", "smart", "mind", "mystery", "puzzle", "documentary", "deep", "interesting"],
    },
    "romantic": {
        "label": "Romantic", "emoji": "💕",
        "movie": {"with": [10749], "without": [27, 10752]},
        "tv": {"with": [18, 35], "without": [80, 10759]},
        "words": ["romantic", "romance", "love", "date", "crush", "valentine", "in love"],
    },
    "adventurous": {
        "label": "Escape reality", "emoji": "🚀",
        "movie": {"with": [12, 14, 878], "without": [99]},
        "tv": {"with": [10765, 10759], "without": [99, 10764]},
        "words": ["escape", "adventure", "adventurous", "fantasy", "space", "magic", "travel", "explore", "epic", "another world"],
    },
}


def detect_mood(text: str) -> str:
    """Pick the mood whose keywords match the text best. Falls back to 'cozy'."""
    t = text.lower()
    scores = {name: sum(1 for w in m["words"] if re.search(rf"\b{re.escape(w)}", t)) for name, m in MOODS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "cozy"


@router.get("/moods")
def list_moods():
    """Moods the frontend can show as buttons."""
    return [{"key": k, "label": m["label"], "emoji": m["emoji"]} for k, m in MOODS.items()]


@router.get("/mood")
async def by_mood(
    mood: str | None = None,
    feeling: str | None = None,
    type: MediaType = MediaType.movie,
    page: int = 1,
):
    """Titles for a mood. Pass `mood` (a key from /moods) or `feeling` (free text, we pick the mood)."""
    if mood is None and not feeling:
        raise HTTPException(status_code=422, detail="Give a mood or describe how you feel")
    if mood is None:
        mood = detect_mood(feeling)
    if mood not in MOODS:
        raise HTTPException(status_code=422, detail=f"Unknown mood. Use one of: {', '.join(MOODS)}")

    rule = MOODS[mood][type.value]
    data = await tmdb_get(
        f"/discover/{type.value}",
        {
            "with_genres": "|".join(map(str, rule["with"])),
            "without_genres": ",".join(map(str, rule["without"])),
            "sort_by": "popularity.desc",
            "vote_average.gte": 6.5,
            "vote_count.gte": 200,
            "page": page,
        },
    )
    m = MOODS[mood]
    return {**data, "mood": {"key": mood, "label": m["label"], "emoji": m["emoji"]}}


# ---------------------------------------------------------------------------
# Personal recommendations from lists + reviews
# ---------------------------------------------------------------------------

POSITIVE = {
    "love", "loved", "amazing", "great", "awesome", "excellent", "brilliant", "beautiful", "masterpiece",
    "fantastic", "perfect", "favorite", "favourite", "enjoyed", "fun", "funny", "best", "wonderful",
    "incredible", "stunning", "gripping", "good", "recommend", "hilarious", "moving", "fav",
}
NEGATIVE = {
    "hate", "hated", "boring", "bad", "awful", "terrible", "worst", "waste", "dull", "slow", "disappointing",
    "disappointed", "stupid", "meh", "mediocre", "overrated", "annoying", "cringe", "predictable", "poor",
    "weak", "mess", "confusing", "bland",
}
NEGATORS = {"not", "never", "no", "isn't", "wasn't", "didn't", "don't", "hardly"}


def sentiment(text: str) -> float:
    """Very small word-list sentiment score from -1 (negative) to 1 (positive). 0 if no opinion words."""
    words = re.findall(r"[a-z']+", (text or "").lower())
    score, hits = 0, 0
    for i, w in enumerate(words):
        s = 1 if w in POSITIVE else -1 if w in NEGATIVE else 0
        if not s:
            continue
        if any(p in NEGATORS for p in words[max(0, i - 2):i]):  # "not good" -> negative
            s = -s
        score += s
        hits += 1
    return score / hits if hits else 0.0


LIST_WEIGHT = {"favorite": 3.0, "watchlist": 1.5, "watched": 1.0}


def review_weight(rating: int, text: str) -> float:
    """5 stars = +4, 3 stars = 0, 1 star = -4, then the review text nudges it by up to +/-1.5."""
    return (rating - 3) * 2 + 1.5 * sentiment(text)


async def _genres_of(media_type: str, tmdb_id: int) -> list[int]:
    try:
        details = await tmdb_get(f"/{media_type}/{tmdb_id}")
    except HTTPException:
        return []
    return [g["id"] for g in details.get("genres", [])]


async def build_profile(uid: str, max_reviews: int = 15) -> dict:
    """Score every title the user touched, then sum those scores per genre."""
    store = get_store()
    titles: dict[tuple[str, int], dict] = {}

    def entry(media_type, tmdb_id, title=None):
        return titles.setdefault((media_type, tmdb_id), {"score": 0.0, "genres": [], "title": title})

    for item in store.saved_items(uid):
        e = entry(item["media_type"], item["tmdb_id"], item.get("title"))
        e["score"] += LIST_WEIGHT.get(item["list"], 1.0)
        e["genres"] = e["genres"] or item.get("genre_ids", [])

    for r in store.reviews_by_user(uid)[:max_reviews]:
        e = entry(r["media_type"], r["tmdb_id"])
        e["score"] += review_weight(r["rating"], r.get("text", ""))
        e["review"] = r["rating"]
        if not e["genres"]:  # reviewed but never saved: ask TMDb for its genres
            e["genres"] = await _genres_of(r["media_type"], r["tmdb_id"])

    return titles


def genre_scores(titles: dict, target: str) -> Counter:
    scores: Counter = Counter()
    for e in titles.values():
        for g in e["genres"]:
            mapped = genre_for(g, target)
            if mapped is not None:
                scores[mapped] += e["score"]
    return scores


@router.get("/me")
async def for_user(type: MediaType = MediaType.movie, user: dict = Depends(current_user)):
    """Step 2 + 3: personal picks from saved lists and reviews (ratings + review sentiment)."""
    target = type.value
    titles = await build_profile(user["uid"])
    if not titles:
        raise HTTPException(status_code=404, detail="Save or rate some titles first to get recommendations")

    scores = genre_scores(titles, target)
    liked = [g for g, s in scores.most_common() if s > 0][:3]
    avoid = [g for g, s in scores.items() if s < 0]
    seen = {tid for (_, tid) in titles}

    # Source A: "more like this" for the user's single best-liked title of this media type.
    seed = max(
        ((k, e) for k, e in titles.items() if k[0] == target and e["score"] > 0),
        key=lambda ke: ke[1]["score"],
        default=None,
    )
    similar, seed_title = [], None
    if seed:
        (mt, tid), e = seed
        try:
            similar = (await tmdb_get(f"/{mt}/{tid}/recommendations")).get("results", [])
        except HTTPException:
            similar = []
        seed_title = e["title"]
        if seed_title is None:  # only reviewed, never saved: look up its name
            try:
                d = await tmdb_get(f"/{mt}/{tid}")
                seed_title = d.get("title") or d.get("name")
            except HTTPException:
                seed_title = None

    # Source B: highly rated titles from the user's top genres, minus genres they dislike.
    by_genre = []
    if liked:
        data = await tmdb_get(
            f"/discover/{target}",
            {
                "with_genres": "|".join(map(str, liked)),
                "without_genres": ",".join(map(str, avoid)) or None,
                "sort_by": "vote_average.desc",
                "vote_count.gte": 300,
            },
        )
        by_genre = data.get("results", [])

    if not similar and not by_genre:
        raise HTTPException(status_code=404, detail="Save or rate some titles you like to get recommendations")

    # Interleave both sources, drop titles already seen or in a disliked genre, no duplicates.
    avoid_set = set(avoid)
    results, used = [], set()
    for i in range(max(len(similar), len(by_genre))):
        for item, reason in (
            (similar[i] if i < len(similar) else None, f"Because you liked {seed_title}" if seed_title else "Similar to titles you liked"),
            (by_genre[i] if i < len(by_genre) else None, "From genres you like"),
        ):
            if not item or item["id"] in seen or item["id"] in used:
                continue
            if avoid_set & set(item.get("genre_ids", [])):
                continue
            used.add(item["id"])
            results.append({**item, "reason": reason})

    return {
        "results": results,
        "based_on": {"liked_genres": liked, "avoided_genres": avoid, "seed_title": seed_title},
    }
