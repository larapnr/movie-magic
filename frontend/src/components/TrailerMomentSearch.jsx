import { useState } from "react";
import { errorMessage, searchTrailerScenes } from "../api/client";
import { btn, input } from "./ui";

const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function TrailerMomentSearch({ title, youtubeKey, onSeek }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  const find = async (event) => {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setEmpty(false);
    setError("");
    setResult(null);
    try {
      const data = await searchTrailerScenes(query);
      const matches = (data?.matches || []).filter((m) => {
        if (youtubeKey && m.youtube_key === youtubeKey) return true;
        if (m.title && title && m.title.toLowerCase() === title.toLowerCase()) return true;
        return !youtubeKey;
      });
      const hit = matches[0] || (data?.matches || [])[0];
      if (!hit) {
        setEmpty(true);
        return;
      }
      setResult(hit);
      if (typeof hit.start_seconds === "number") onSeek?.(Math.floor(hit.start_seconds));
    } catch (err) {
      if (err.response?.status === 501) {
        setError("Scene search is not connected yet. The layout is in place for this trailer.");
        return;
      }
      setError(errorMessage(err, "Couldn't search this trailer."));
    } finally {
      setBusy(false);
    }
  };

  let body = "A short description of the moment will appear here.";
  if (busy) body = "Looking in this trailer…";
  else if (error) body = error;
  else if (empty) body = "Nothing in this trailer matches that. Try another moment.";
  else if (result) body = result.sentence || result.title || "Matched this trailer window.";

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
        <button disabled={busy} className={`${btn.primary} px-6`}>
          Find
        </button>
      </form>
      <div className="mt-3 min-h-[3.5rem] rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-400">
        <p className={result ? "text-neutral-200" : ""}>{body}</p>
        {result && result.start_seconds != null && (
          <p className="mt-1 text-xs text-neutral-500">
            {ts(result.start_seconds)}
            {result.end_seconds != null ? `–${ts(result.end_seconds)}` : ""}
          </p>
        )}
      </div>
    </section>
  );
}import { useState } from "react";
import { errorMessage, searchTrailerScenes } from "../api/client";
import { btn, input } from "./ui";

const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function TrailerMomentSearch({ title, youtubeKey, onSeek }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  const find = async (event) => {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setEmpty(false);
    setError("");
    setResult(null);
    try {
      const data = await searchTrailerScenes(query);
      const matches = (data?.matches || []).filter((m) => {
        if (youtubeKey && m.youtube_key === youtubeKey) return true;
        if (m.title && title && m.title.toLowerCase() === title.toLowerCase()) return true;
        return !youtubeKey;
      });
      const hit = matches[0] || (data?.matches || [])[0];
      if (!hit) {
        setEmpty(true);
        return;
      }
      setResult(hit);
      if (typeof hit.start_seconds === "number") onSeek?.(Math.floor(hit.start_seconds));
    } catch (err) {
      if (err.response?.status === 501) {
        setError("Scene search is not connected yet. The layout is in place for this trailer.");
        return;
      }
      setError(errorMessage(err, "Couldn't search this trailer."));
    } finally {
      setBusy(false);
    }
  };

  let body = "A short description of the moment will appear here.";
  if (busy) body = "Looking in this trailer…";
  else if (error) body = error;
  else if (empty) body = "Nothing in this trailer matches that. Try another moment.";
  else if (result) body = result.sentence || result.title || "Matched this trailer window.";

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
        <button disabled={busy} className={`${btn.primary} px-6`}>
          Find
        </button>
      </form>
      <div className="mt-3 min-h-[3.5rem] rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-400">
        <p className={result ? "text-neutral-200" : ""}>{body}</p>
        {result && result.start_seconds != null && (
          <p className="mt-1 text-xs text-neutral-500">
            {ts(result.start_seconds)}
            {result.end_seconds != null ? `–${ts(result.end_seconds)}` : ""}
          </p>
        )}
      </div>
    </section>
  );
}
