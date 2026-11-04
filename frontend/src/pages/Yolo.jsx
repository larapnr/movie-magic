import { useState } from "react";
import { Link } from "react-router-dom";
import { getYolo } from "../api/client";

export default function Yolo() {
  const [pick, setPick] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roll = async () => {
    setLoading(true);
    setError("");
    try {
      setPick(await getYolo({ type: "movie" }));
    } catch {
      setError("No trailer found, try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="mb-4 text-2xl font-semibold">YOLO</h1>
      <button onClick={roll} disabled={loading} className="rounded bg-white px-5 py-2 font-medium text-black disabled:opacity-50">
        {pick ? "Roll again" : "Surprise me"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {pick && (
        <div className="mt-6">
          <Link to={`/${pick.media_type}/${pick.id}`} className="text-xl font-semibold hover:underline">
            {pick.title || pick.name}
          </Link>
          <div className="mx-auto mt-4 aspect-video">
            <iframe
              className="h-full w-full rounded"
              src={`https://www.youtube.com/embed/${pick.trailerKey}`}
              title="Trailer"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
