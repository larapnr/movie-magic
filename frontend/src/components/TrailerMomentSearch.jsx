import { useEffect, useState } from "react";
import { errorMessage, searchTrailerScenes } from "../api/client";
import { btn, input } from "./ui";

const PLAY_FOR = 6;

const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

function trailerFrame() {
  return (
    document.getElementById("trailer-player") ||
    document.querySelector(
      'iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]'
    )
  );
}

export function playTrailerWindow(youtubeKey, start, end) {
  const iframe = trailerFrame();
  if (!iframe || !youtubeKey || start == null) return false;
  if (!iframe.id) iframe.id = "trailer-player";
  iframe.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  );
  const url =
    `https://www.youtube.com/embed/${youtubeKey}` +
    `?start=${start}&end=${end}&autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
  if (iframe.src === url) {
    iframe.src = "about:blank";
    window.setTimeout(() => {
      iframe.src = url;
    }, 40);
  } else {
    iframe.src = url;
  }
  return true;
}

export default function TrailerMomentSearch({ title, youtubeKey, onSeek }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [clip, setClip] = useState(null);

  useEffect(() => {
    if (!clip || !youtubeKey) return undefined;
    const timer = window.setTimeout(() => {
      playTrailerWindow(youtubeKey, clip.start, clip.end);
    }, 30);
    return () => window.clearTimeout(timer);
  }, [clip, youtubeKey]);

  const find = async (event) => {
    event.preventDefault();
    const query = q.trim();
    if (!query || !youtubeKey) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await searchTrailerScenes(query, { youtube_key: youtubeKey, title });
      const hit = (data?.matches || []).find((match) => match && match.start_seconds != null);
      if (!hit) {
        setError(data?.reason || "Nothing in this trailer matches that.");
        return;
      }
      const start = Math.max(0, Math.floor(Number(hit.start_seconds)));
      const end = Math.max(start + 1, Math.floor(Number(hit.end_seconds ?? start + PLAY_FOR)));
      const next = { ...hit, start_seconds: start, end_seconds: end };
      setResult(next);
      setClip({ start, end, nonce: Date.now() });
      onSeek?.(start, end);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : errorMessage(err, "Couldn't search this trailer."));
    } finally {
      setBusy(false);
    }
  };

  const replay = (event) => {
    event.preventDefault();
    if (!result) return;
    playTrailerWindow(youtubeKey, result.start_seconds, result.end_seconds);
  };

  let body = "A short description of the moment will appear here.";
  if (busy) body = "Looking through this trailer… the first picture search can take up to a minute.";
  else if (error) body = error;
  else if (result) body = result.sentence || "Matched a moment in this trailer.";

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Moment in this trailer</p>
      <form onSubmit={find} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Describe a moment in ${title}`}
          aria-label={`Describe a moment in ${title}`}
          className={`${input} py-3`}
        />
        <button type="submit" disabled={busy} className={`${btn.primary} px-6`}>
          {busy ? "Finding" : "Find"}
        </button>
      </form>
      <div className="mt-3 min-h-[3.5rem] rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-400">
        <p className={result ? "text-neutral-200" : ""}>{body}</p>
        {result && result.start_seconds != null && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-neutral-500">
              {clock(result.start_seconds)}–{clock(result.end_seconds)}
              {result.mode === "visual" ? " · picture" : " · spoken"}
            </p>
            <button type="button" onClick={replay} className={`${btn.primary} px-3 py-1.5 text-xs`}>
              Play these 6 seconds
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
