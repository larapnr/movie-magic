import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDetails, addToList } from "../api/client";
import { useAuth } from "../context/AuthContext";
import MediaRow from "../components/MediaRow";
import { IMG } from "../components/MediaCard";

export default function Detail() {
  const { mediaType, id } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["details", mediaType, id],
    queryFn: () => getDetails(mediaType, id),
  });

  if (isLoading) return <p className="text-neutral-400">Loading...</p>;
  if (isError || !data) return <p className="text-red-400">Could not load this title.</p>;

  const title = data.title || data.name;
  const trailer = data.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer");
  const providers = data["watch/providers"]?.results?.US?.flatrate || [];

  const save = (list) =>
    addToList(list, mediaType, id, {
      title,
      poster_path: data.poster_path,
      genre_ids: (data.genres || []).map((g) => g.id),
    });

  return (
    <article>
      <div className="flex flex-col gap-6 md:flex-row">
        {data.poster_path && (
          <img src={`${IMG}${data.poster_path}`} alt={title} className="w-56 self-start rounded" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {(data.genres || []).map((g) => g.name).join(", ")} · TMDb {data.vote_average?.toFixed(1)}
          </p>
          <p className="mt-4 max-w-2xl text-neutral-200">{data.overview}</p>

          {user && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => save("favorite")} className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700">
                Favorite
              </button>
              <button onClick={() => save("watchlist")} className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700">
                Watchlist
              </button>
              <button onClick={() => save("watched")} className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700">
                Watched
              </button>
            </div>
          )}

          {providers.length > 0 && (
            <p className="mt-4 text-sm text-neutral-400">
              Stream on: {providers.map((p) => p.provider_name).join(", ")}
            </p>
          )}
        </div>
      </div>

      {trailer && (
        <div className="mt-8 aspect-video max-w-3xl">
          <iframe
            className="h-full w-full rounded"
            src={`https://www.youtube.com/embed/${trailer.key}`}
            title="Trailer"
            allowFullScreen
          />
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-xl font-semibold">Cast</h2>
        <p className="text-sm text-neutral-300">
          {(data.credits?.cast || []).slice(0, 10).map((c) => c.name).join(", ")}
        </p>
      </section>

      {/* TODO (accounts owner): reviews list, star rating, write/edit/delete review, average user rating. */}

      <div className="mt-8">
        <MediaRow title="Similar titles" items={data.recommendations?.results} mediaType={mediaType} />
      </div>
    </article>
  );
}
