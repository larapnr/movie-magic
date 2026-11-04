import { Link } from "react-router-dom";

export const IMG = "https://image.tmdb.org/t/p/w342";

export default function MediaCard({ item, mediaType }) {
  const type = mediaType || item.media_type || (item.title ? "movie" : "tv");
  if (type !== "movie" && type !== "tv") return null; // skips people in multi search
  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date || "";

  return (
    <Link to={`/${type}/${item.id}`} className="group block">
      {item.poster_path ? (
        <img
          src={`${IMG}${item.poster_path}`}
          alt={title}
          loading="lazy"
          className="aspect-[2/3] w-full rounded object-cover transition group-hover:opacity-80"
        />
      ) : (
        <div className="flex aspect-[2/3] w-full items-center justify-center rounded bg-neutral-800 text-xs text-neutral-500">
          No poster
        </div>
      )}
      <p className="mt-2 truncate text-sm font-medium">{title}</p>
      <p className="text-xs text-neutral-400">
        {date.slice(0, 4)}
        {item.vote_average ? ` · ${item.vote_average.toFixed(1)}` : ""}
      </p>
    </Link>
  );
}
