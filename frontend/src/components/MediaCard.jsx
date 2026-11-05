import { Link } from "react-router-dom";
import { titleOf, typeOf, yearOf } from "../hooks";

export const IMG = "https://image.tmdb.org/t/p/w342";
export const IMG_LARGE = "https://image.tmdb.org/t/p/w780";
export const BACKDROP = "https://image.tmdb.org/t/p/w1280";
export const PROFILE = "https://image.tmdb.org/t/p/w185";
export const LOGO = "https://image.tmdb.org/t/p/w92";

export function Poster({ path, title, className = "" }) {
  return path ? (
    <img
      src={`${IMG}${path}`}
      alt={title}
      loading="lazy"
      className={`aspect-[2/3] w-full rounded-lg bg-neutral-800 object-cover ${className}`}
    />
  ) : (
    <div
      className={`flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-neutral-800 p-2 text-center text-xs text-neutral-500 ${className}`}
    >
      {title || "No poster"}
    </div>
  );
}

export default function MediaCard({ item, mediaType, showType = false, footer }) {
  const type = typeOf(item, mediaType);
  if (type !== "movie" && type !== "tv") return null; // skips people in multi search
  const title = titleOf(item);
  const year = yearOf(item);

  return (
    <div className="group">
      <Link to={`/${type}/${item.id}`} className="block focus:outline-none">
        <div className="relative overflow-hidden rounded-lg ring-1 ring-white/5 transition group-hover:ring-white/30 group-focus-within:ring-white/60">
          <Poster path={item.poster_path} title={title} className="transition duration-300 group-hover:scale-105" />
          {item.vote_average > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-medium text-amber-300 backdrop-blur">
              ★ {item.vote_average.toFixed(1)}
            </span>
          )}
          {showType && (
            <span className="absolute right-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 backdrop-blur">
              {type === "tv" ? "TV" : "Movie"}
            </span>
          )}
        </div>
        <p className="mt-2 truncate text-sm font-medium group-hover:text-white">{title}</p>
        <p className="text-xs text-neutral-500">{year || "TBA"}</p>
      </Link>
      {footer}
    </div>
  );
}
