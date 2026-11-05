import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, getYolo } from "../api/client";
import { Poster } from "../components/MediaCard";
import { Message, Segmented, Spinner, btn } from "../components/ui";
import { titleOf, useGenres, yearOf } from "../hooks";

export default function Yolo() {
  const [type, setType] = useState("movie");
  const [genre, setGenre] = useState("");
  const [pick, setPick] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { genres, byId } = useGenres(type);

  const roll = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getYolo({ type, genre: genre || undefined });
      if (pick) setHistory((h) => [pick, ...h.filter((x) => x.id !== pick.id)].slice(0, 6));
      setPick(next);
    } catch (err) {
      setError(err.response?.status === 404 ? "Couldn't find one with a trailer. Roll again!" : errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const changeType = (t) => {
    setType(t);
    setGenre("");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Can't decide? <span className="text-amber-400">YOLO.</span>
        </h1>
        <p className="mt-2 text-neutral-400">We'll pick something well rated at random and play its trailer.</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Segmented
            label="Type"
            value={type}
            onChange={changeType}
            options={[
              { value: "movie", label: "Movie" },
              { value: "tv", label: "TV show" },
            ]}
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Genre"
            className="rounded-full bg-neutral-800 px-4 py-1.5 text-sm outline-none"
          >
            <option value="">Any genre</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button onClick={roll} disabled={loading} className={`${btn.primary} px-6`}>
            {loading ? <Spinner className="border-neutral-300 border-t-black" /> : pick ? "🎲 Roll again" : "🎲 Surprise me"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Message title={error} tone="error" />
        </div>
      )}

      {pick && (
        <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
          <div className="aspect-video bg-black">
            <iframe
              key={pick.trailerKey}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${pick.trailerKey}`}
              title={`${titleOf(pick)} trailer`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{titleOf(pick)}</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {[yearOf(pick), (pick.genre_ids || []).map((id) => byId[id]).filter(Boolean).slice(0, 3).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
                {pick.vote_average > 0 && <span className="ml-2 text-amber-300">★ {pick.vote_average.toFixed(1)}</span>}
              </p>
              <p className="mt-3 line-clamp-4 text-sm text-neutral-300">{pick.overview}</p>
            </div>
            <Link to={`/${pick.media_type}/${pick.id}`} className={btn.secondary}>
              Full details →
            </Link>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Previous rolls</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {history.map((h) => (
              <Link key={h.id} to={`/${h.media_type}/${h.id}`} className="group">
                <Poster path={h.poster_path} title={titleOf(h)} className="transition group-hover:opacity-80" />
                <p className="mt-1 truncate text-xs text-neutral-400">{titleOf(h)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
