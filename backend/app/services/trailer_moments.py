# Spoken queries use trailer captions. Picture queries are scored against frames
# with CLIP. A match always includes start_seconds and end_seconds (start + 6).

from __future__ import annotations

import math
import os
import re
import subprocess
import sys
import urllib.request
from io import BytesIO
from pathlib import Path

PLAY_SECONDS = 6
CLIP_REPO = "Xenova/clip-vit-base-patch32"
_STOP = {
    "a", "an", "the", "in", "on", "of", "and", "or", "to", "with", "at", "for",
    "from", "into", "over", "under", "this", "that", "it", "is", "are", "his",
    "her", "their", "its",
}
_CAPTIONS: dict[str, tuple[list[dict], str | None]] = {}
_FRAMES: dict[str, tuple[list[dict], str, float | None]] = {}
_ANSWERS: dict[tuple[str, str], dict] = {}


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)


def _token() -> str:
    _load_env()
    raw = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or ""
    return raw.strip().strip('"').strip("'")


def _short(exc: BaseException) -> str:
    text = f"{exc.__class__.__name__}: {exc}"
    text = re.sub(r"hf_[A-Za-z0-9]+", "hf_…", text)
    return text[:280]


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", (text or "").lower())


def _words(text: str) -> list[str]:
    return [word for word in _tokens(text) if word not in _STOP and len(word) > 1]


def _covers(term: str, haystack: set[str]) -> bool:
    if term in haystack:
        return True
    if len(term) < 4:
        return False
    return any(word.startswith(term) or term.startswith(word) for word in haystack if len(word) >= 4)


def _norm_cues(raw) -> list[dict]:
    cues = []
    for item in raw or []:
        if isinstance(item, dict):
            text, start, dur = item.get("text"), item.get("start"), item.get("duration")
        else:
            text = getattr(item, "text", None)
            start = getattr(item, "start", None)
            dur = getattr(item, "duration", None)
        if text is None or start is None:
            continue
        cues.append({
            "text": re.sub(r"\s+", " ", str(text)).strip(),
            "start": float(start),
            "duration": float(dur or 0),
        })
    cues.sort(key=lambda cue: cue["start"])
    return [cue for cue in cues if cue["text"]]


def _captions(video_id: str) -> tuple[list[dict], str | None]:
    cached = _CAPTIONS.get(video_id)
    if cached is not None:
        return cached
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        result = ([], "youtube-transcript-api is not installed in the backend venv")
        return result

    api = YouTubeTranscriptApi()
    fetched = None
    error = None
    if hasattr(api, "fetch"):
        try:
            fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except TypeError:
            try:
                fetched = api.fetch(video_id)
            except Exception as exc:
                error = _short(exc)
        except Exception as first:
            error = _short(first)
            try:
                tracks = list(api.list(video_id))
                if tracks:
                    fetched = tracks[0].fetch()
                    error = None
            except Exception as exc:
                error = _short(exc)
    else:
        try:
            fetched = YouTubeTranscriptApi.get_transcript(video_id)
        except Exception as exc:
            error = _short(exc)

    if fetched is None:
        if error and ("transcriptsdisabled" in error.lower() or "subtitles are disabled" in error.lower()):
            error = None
        result = ([], error if error else None)
        return result
    raw = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else fetched
    cues = _norm_cues(raw)
    result = (cues, None if cues else "this trailer has no captions")
    if cues:
        _CAPTIONS[video_id] = result
    return result


def _best_caption(query: str, cues: list[dict]) -> dict | None:
    wanted = _words(query)
    stopword_query = False
    if not wanted:
        wanted = [word for word in _tokens(query) if len(word) > 1]
        stopword_query = True
    if not wanted or not cues:
        return None
    ranked = []
    for cue in cues:
        start = cue["start"]
        end = start + PLAY_SECONDS
        parts = [
            other["text"]
            for other in cues
            if other["start"] < end and other["start"] + other["duration"] > start
        ]
        text = " ".join(parts)
        haystack = set(_tokens(text) if stopword_query else _words(text))
        hits = sum(1 for term in wanted if _covers(term, haystack))
        if hits:
            ranked.append((hits, start, text))
    if not ranked:
        return None
    hits, start, text = max(ranked, key=lambda row: (row[0], -row[1]))
    total = len(wanted)
    return {
        "start": start,
        "text": text[:240],
        "score": hits / total,
        "strong": hits == total,
    }


def _download(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.youtube.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def _jpeg(image) -> bytes:
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


def _busy(image) -> bool:
    pixels = list(image.resize((8, 8)).convert("L").getdata())
    mean = sum(pixels) / len(pixels)
    variance = sum((pixel - mean) ** 2 for pixel in pixels) / len(pixels)
    return variance > 12


def _android_duration(video_id: str) -> float | None:
    import json

    payload = {
        "context": {
            "client": {
                "clientName": "ANDROID_VR",
                "clientVersion": "1.65.10",
                "hl": "en",
                "gl": "US",
            }
        },
        "videoId": video_id,
    }
    request = urllib.request.Request(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L) gzip",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            info = json.loads(response.read().decode())
    except Exception:
        return None
    seconds = (info.get("videoDetails") or {}).get("lengthSeconds")
    try:
        value = float(seconds)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _ytdlp_info(video_id: str) -> tuple[dict | None, str | None]:
    url = f"https://www.youtube.com/watch?v={video_id}"
    commands = [
        [sys.executable, "-m", "yt_dlp", "-J", "--skip-download", "--no-warnings", "--no-playlist", url],
        ["yt-dlp", "-J", "--skip-download", "--no-warnings", "--no-playlist", url],
    ]
    proc = None
    for cmd in commands:
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=70)
        except FileNotFoundError:
            continue
        except subprocess.TimeoutExpired:
            return None, "yt-dlp timed out reading this trailer"
        err = (proc.stderr or "") + (proc.stdout or "")
        if proc.returncode == 0 and (proc.stdout or "").strip().startswith("{"):
            break
        if "No module named yt_dlp" in err:
            proc = None
            continue
        break
    if proc is None:
        return None, "Picture search could not read frames. In the backend folder run: pip install yt-dlp"
    if proc.returncode != 0 or not proc.stdout.strip().startswith("{"):
        err = (proc.stderr or proc.stdout or "").strip()
        if "Sign in to confirm" in err:
            return None, "YouTube blocked frame download from this machine"
        return None, _short(RuntimeError(err.splitlines()[-1] if err else "yt-dlp failed"))[:280]
    import json
    try:
        return json.loads(proc.stdout), None
    except json.JSONDecodeError as exc:
        return None, _short(exc)


def _storyboard_frames(info: dict, duration: float | None) -> list[dict]:
    try:
        from PIL import Image
    except ImportError:
        return []
    formats = [
        fmt for fmt in info.get("formats") or []
        if str(fmt.get("format_id") or "").startswith("sb")
    ]
    if not formats:
        return []
    formats.sort(key=lambda fmt: (fmt.get("width") or 0) * (fmt.get("height") or 0))
    fmt = formats[-1]
    cols = max(1, int(fmt.get("columns") or 1))
    rows = max(1, int(fmt.get("rows") or 1))
    fps = float(fmt.get("fps") or 0)
    interval = (1.0 / fps) if fps else None
    fragments = list(fmt.get("fragments") or [])
    sheet_url = fmt.get("url") or ""
    if not fragments and "$M" in sheet_url and interval and duration:
        frame_count = max(1, int(round(fps * duration)))
        sheets = math.ceil(frame_count / (cols * rows))
        fragments = [{"url": sheet_url.replace("$M", str(index))} for index in range(sheets)]
    elif not fragments and sheet_url and "$M" not in sheet_url:
        fragments = [{"url": sheet_url}]

    frames = []
    index = 0
    for fragment in fragments:
        url = fragment.get("url")
        if not url:
            index += cols * rows
            continue
        try:
            sheet = Image.open(BytesIO(_download(url))).convert("RGB")
        except Exception:
            index += cols * rows
            continue
        cell_w = max(1, sheet.width // cols)
        cell_h = max(1, sheet.height // rows)
        for row in range(rows):
            for col in range(cols):
                seconds = (index * interval) if interval else None
                index += 1
                if seconds is None:
                    continue
                if duration and seconds >= duration - 0.05:
                    continue
                cell = sheet.crop((
                    col * cell_w,
                    row * cell_h,
                    min(sheet.width, (col + 1) * cell_w),
                    min(sheet.height, (row + 1) * cell_h),
                ))
                if cell.width < 8 or cell.height < 8 or not _busy(cell):
                    continue
                frames.append({"seconds": float(seconds), "jpeg": _jpeg(cell)})
    return frames


def _preview_frames(video_id: str, duration: float | None) -> list[dict]:
    if not duration:
        return []
    try:
        from PIL import Image
    except ImportError:
        return []
    frames = []
    for name, ratio in (("maxres1.jpg", 0.25), ("maxres2.jpg", 0.50), ("maxres3.jpg", 0.75)):
        try:
            image = Image.open(BytesIO(_download(f"https://i.ytimg.com/vi/{video_id}/{name}")))
        except Exception:
            continue
        if image.width < 200 or image.height < 100:
            continue
        frames.append({"seconds": float(duration) * ratio, "jpeg": _jpeg(image)})
    return frames


def _frames(video_id: str, cues: list[dict]) -> tuple[list[dict], str, float | None, str | None]:
    cached = _FRAMES.get(video_id)
    if cached is not None:
        frames, source, duration = cached
        return frames, source, duration, None

    info, yt_err = _ytdlp_info(video_id)
    duration = None
    if info and info.get("duration"):
        duration = float(info["duration"])
    elif cues:
        last = max(cues, key=lambda cue: cue["start"] + cue["duration"])
        duration = last["start"] + last["duration"]
    else:
        duration = _android_duration(video_id)

    frames = _storyboard_frames(info, duration) if info else []
    source = "frame"
    note = None
    if len(frames) >= 4:
        source = "frame"
    else:
        preview = _preview_frames(video_id, duration)
        if preview:
            frames = preview
            source = "preview"
            note = yt_err
        else:
            return [], "none", duration, yt_err or "no frames could be read from this trailer"
    _FRAMES[video_id] = (frames, source, duration)
    return frames, source, duration, note



_CLIP = None


def _clip_bundle():
    global _CLIP
    if _CLIP is not None:
        return _CLIP
    import json

    import numpy as np
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    from tokenizers import Tokenizer

    token = _token() or None
    vision_path = hf_hub_download(CLIP_REPO, "onnx/vision_model_quantized.onnx", token=token)
    text_path = hf_hub_download(CLIP_REPO, "onnx/text_model_quantized.onnx", token=token)
    tokenizer_path = hf_hub_download(CLIP_REPO, "tokenizer.json", token=token)
    config = json.loads(Path(hf_hub_download(CLIP_REPO, "preprocessor_config.json", token=token)).read_text())
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    _CLIP = {
        "vision": ort.InferenceSession(vision_path, sess_options=options, providers=["CPUExecutionProvider"]),
        "text": ort.InferenceSession(text_path, sess_options=options, providers=["CPUExecutionProvider"]),
        "tokenizer": Tokenizer.from_file(tokenizer_path),
        "mean": np.array(config["image_mean"], dtype=np.float32),
        "std": np.array(config["image_std"], dtype=np.float32),
        "np": np,
    }
    return _CLIP


def _text_vector(bundle, prompt: str):
    np = bundle["np"]
    ids = bundle["tokenizer"].encode(f"a photo of {prompt.lower()}").ids[:77]
    if len(ids) < 77:
        ids = ids + [49407] * (77 - len(ids))
    array = np.array([ids], dtype=np.int64)
    vector = bundle["text"].run(None, {"input_ids": array})[0][0]
    return vector / (np.linalg.norm(vector) + 1e-8)


def _pixel_batch(bundle, frames: list[dict]):
    from PIL import Image

    np = bundle["np"]
    batch = []
    for frame in frames:
        image = Image.open(BytesIO(frame["jpeg"])).convert("RGB")
        scale = 224 / min(image.size)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.BICUBIC)
        left = max(0, (image.width - 224) // 2)
        top = max(0, (image.height - 224) // 2)
        image = image.crop((left, top, left + 224, top + 224))
        array = np.asarray(image).astype(np.float32) / 255.0
        array = (array - bundle["mean"]) / bundle["std"]
        batch.append(np.transpose(array, (2, 0, 1)))
    return np.stack(batch).astype(np.float32)


def _score_frames(query: str, frames: list[dict]) -> tuple[dict | None, str | None]:
    if not frames:
        return None, "no frames to compare"
    try:
        bundle = _clip_bundle()
        pixels = _pixel_batch(bundle, frames)
        image_vectors = bundle["vision"].run(None, {"pixel_values": pixels})[0]
        text_vector = _text_vector(bundle, query)
        other_vector = _text_vector(bundle, "something else")
        np = bundle["np"]
        image_vectors = image_vectors / (np.linalg.norm(image_vectors, axis=1, keepdims=True) + 1e-8)
        query_sim = image_vectors @ text_vector
        other_sim = image_vectors @ other_vector
        scores = 1.0 / (1.0 + np.exp(100.0 * (other_sim - query_sim)))
    except Exception as exc:
        return None, _short(exc)
    winner = int(np.argmax(scores))
    picked = dict(frames[winner])
    picked["score"] = float(scores[winner])
    return picked, None

def _clip_pick(query: str, frames: list[dict]) -> tuple[dict | None, str | None]:
    if len(frames) <= 4:
        return _score_frames(query, frames)
    indexes = sorted({min(len(frames) - 1, int(i * len(frames) / 8)) for i in range(8)})
    sample = [frames[index] for index in indexes]
    winner, err = _score_frames(query, sample)
    if err or not winner:
        return winner, err
    nearby = [frame for frame in frames if abs(frame["seconds"] - winner["seconds"]) <= 8]
    if len(nearby) <= 1:
        return winner, None
    refined, refine_err = _score_frames(query, nearby)
    if refine_err or not refined:
        return winner, None
    return refined, None


def _window(start: float) -> tuple[int, int]:
    begin = max(0, int(math.floor(start)))
    return begin, begin + PLAY_SECONDS


def _match(video_id: str, title: str | None, start: float, sentence: str, score: float, mode: str, precision: str) -> dict:
    begin, end = _window(start)
    return {
        "youtube_key": video_id,
        "title": title,
        "start_seconds": begin,
        "end_seconds": end,
        "sentence": sentence,
        "score": round(float(score), 3),
        "mode": mode,
        "precision": precision,
    }


def _pack(query: str, video_id: str, title: str | None, match: dict, mode: str) -> dict:
    return {
        "query": query,
        "matches": [match],
        "reason": None,
        "youtube_key": video_id,
        "title": title,
        "mode": mode,
    }


def search_moments(query: str, youtube_key: str | None = None, title: str | None = None) -> dict:
    _load_env()
    text = (query or "").strip()
    video_id = (youtube_key or "").strip()
    if not video_id:
        return {
            "query": text,
            "matches": [],
            "reason": "This title has no trailer to search.",
            "mode": "none",
        }

    cache_key = (video_id, text.lower())
    cached = _ANSWERS.get(cache_key)
    if cached is not None:
        return cached

    cues, cap_err = _captions(video_id)
    spoken = _best_caption(text, cues) if cues else None
    if spoken and spoken["strong"]:
        result = _pack(
            text,
            video_id,
            title,
            _match(video_id, title, spoken["start"], spoken["text"], spoken["score"], "captions", "caption"),
            "captions",
        )
        _ANSWERS[cache_key] = result
        return result

    frames, source, _duration, frame_note = _frames(video_id, cues)
    visual, vis_err = (None, None)
    if frames:
        visual, vis_err = _clip_pick(text, frames)

    if visual:
        if source == "preview":
            sentence = f'Closest preview frame to “{text}” ({int(round(visual["score"] * 100))}% match).'
        else:
            sentence = f'Closest frame to “{text}” ({int(round(visual["score"] * 100))}% match).'
        if visual["score"] < 0.4:
            sentence += " Low confidence — try a more specific phrase."
        result = _pack(
            text,
            video_id,
            title,
            _match(video_id, title, max(0.0, visual["seconds"] - 1), sentence, visual["score"], "visual", source),
            "visual",
        )
        _ANSWERS[cache_key] = result
        return result

    if spoken:
        result = _pack(
            text,
            video_id,
            title,
            _match(video_id, title, spoken["start"], spoken["text"], spoken["score"], "captions", "caption"),
            "captions",
        )
        _ANSWERS[cache_key] = result
        return result

    if cap_err and ("transcriptsdisabled" in cap_err.lower() or "subtitles are disabled" in cap_err.lower()):
        cap_err = None
    reasons = [part for part in (frame_note, vis_err, "No picture in this trailer matched that." if not cap_err else cap_err) if part]
    # frame_note is only a problem when we had to fall back and then also failed
    if source == "preview":
        reasons = [part for part in reasons if part != frame_note]
    return {
        "query": text,
        "matches": [],
        "reason": " · ".join(dict.fromkeys(reasons)),
        "youtube_key": video_id,
        "title": title,
        "mode": "none",
    }
