import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { errorMessage, getDetails } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import MediaRow from "../components/MediaRow";
import Reviews from "../components/Reviews";
import { BACKDROP, IMG_LARGE, LOGO, PROFILE, Poster } from "../components/MediaCard";
import { Message, btn } from "../components/ui";
import { LISTS, useLists } from "../hooks";
import NotFound from "./NotFound";
import TrailerMomentSearch from "../components/TrailerMomentSearch";

const region = () => {
  const r = (navigator.language || "").split("-")[1];
  return r ? r.toUpperCase() : "US";
};

const runtime = (mins) => (mins ? `${Math.floor(mins / 60) ? `${Math.floor(mins / 60)}h ` : ""}${mins % 60}m` : null);

function ListButtons({ mediaType, id, data, title }) {
  const { user } = useAuth();
  const location = useLocation();
  const lists = useLists();
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  if (!user)
    return (
      <Link to="/login" state={{ from: location }} className={btn.secondary}>
        Log in to save
      </Link>
    );

  const toggle = async (list) => {
    setBusy(list.key);
    const on = lists.has(list.key, mediaType, id);
    try {
      if (on) await lists.remove(list.key, mediaType, id);
      else
        await lists.add(list.key, mediaType, id, {
          title,
          poster_path: data.poster_path,
          genre_ids: (data.genres || []).map((g) => g.id),
        });
      toast(on ? `Removed from ${list.label}` : `Added to ${list.label}`);
    } catch (err) {
      toast(errorMessage(err, "Couldn't update your list."), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {LISTS.map((l) => {
        const on = lists.has(l.key, mediaType, id);
        return (
          <button
            key={l.key}
            onClick={() => toggle(l)}
            disabled={busy === l.key || lists.isLoading}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition disabled:opacity-60 ${
              on ? "bg-amber-400 font-medium text-black hover:bg-amber-300" : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
            }`}
          >
            <span aria-hidden>{l.icon}</span>
            {on ? `In ${l.label}` : l.label}
          </button>
        );
      })}
    </div>
  );
}

function Providers({ data }) {
  const all = data["watch/providers"]?.results || {};
  const code = all[region()] ? region() : "US";
  const p = all[code];
  if (!p) return null;
  const groups = [
    ["Stream", p.flatrate],
    ["Rent", p.rent],
    ["Buy", p.buy],
  ].filter(([, list]) => list?.length);
  if (!groups.length) return null;

  return (
    <div className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Where to watch ({code})</p>
      <div className="space-y-2">
        {groups.map(([label, list]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-12 text-xs text-neutral-400">{label}</span>
            <div className="flex flex-wrap gap-2">
              {list.slice(0, 8).map((prov) => (
                <a key={prov.provider_id} href={p.link} target="_blank" rel="noreferrer" title={prov.provider_name}>
                  <img src={`${LOGO}${prov.logo_path}`} alt={prov.provider_name} className="h-9 w-9 rounded-lg" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-600">Availability data from JustWatch via TMDb.</p>
    </div>
  );
}

export default function Detail() {
  const { mediaType, id } = useParams();
  const valid = (mediaType === "movie" || mediaType === "tv") && /^\d+$/.test(id);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["details", mediaType, id],
    queryFn: () => getDetails(mediaType, id),
    enabled: valid,
  });

  const [trailerStart, setTrailerStart] = useState(undefined);

  if (!valid) return <NotFound />;
  if (isLoading)
    return (
      <div className="animate-pulse">
        <div className="-mx-4 h-72 bg-neutral-900 sm:mx-0 sm:rounded-2xl" />
        <div className="mt-6 h-8 w-1/3 rounded bg-neutral-900" />
        <div className="mt-3 h-4 w-1/2 rounded bg-neutral-900" />
      </div>
    );
  if (isError || !data)
    return (
      <Message title={error?.response?.status === 404 ? "Title not found" : "Couldn't load this title"} tone="error" action={<Link to="/" className={btn.secondary}>Back home</Link>}>
        {errorMessage(error)}
      </Message>
    );

  const title = data.title || data.name;
  const year = (data.release_date || data.first_air_date || "").slice(0, 4);
  const videos = data.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");
  const cast = (data.credits?.cast || []).slice(0, 14);
  const crew = data.credits?.crew || [];
  const directors = crew.filter((c) => c.job === "Director").map((c) => c.name);
  const writers = [...new Set(crew.filter((c) => c.department === "Writing").map((c) => c.name))].slice(0, 3);
  const creators = (data.created_by || []).map((c) => c.name);
  const facts = [
    year,
    mediaType === "movie" ? runtime(data.runtime) : data.number_of_seasons && `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}`,
    mediaType === "tv" && data.status,
    (data.genres || []).map((g) => g.name).join(", "),
  ].filter(Boolean);

  return (
    <article>
      <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl">
        {data.backdrop_path && (
          <img src={`${BACKDROP}${data.backdrop_path}`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-neutral-950/30" />
        <div className="relative flex flex-col gap-6 px-4 py-8 sm:flex-row sm:p-10">
          <div className="w-40 shrink-0 self-center sm:w-56 sm:self-start">
            {data.poster_path ? (
              <img src={`${IMG_LARGE}${data.poster_path}`} alt={title} className="w-full rounded-xl shadow-2xl ring-1 ring-white/10" />
            ) : (
              <Poster title={title} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">{mediaType === "tv" ? "TV series" : "Movie"}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
            {data.tagline && <p className="mt-1 italic text-neutral-400">{data.tagline}</p>}
            <p className="mt-2 text-sm text-neutral-300">{facts.join(" · ")}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              {data.vote_average > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-400 px-2 py-1 text-sm font-bold text-black">TMDb {data.vote_average.toFixed(1)}</span>
                  <span className="text-xs text-neutral-400">{data.vote_count?.toLocaleString()} votes</span>
                </div>
              )}
              <a href="#reviews-heading" className="text-sm text-neutral-300 underline-offset-2 hover:underline">
                Community reviews ↓
              </a>
            </div>

            <p className="mt-4 max-w-3xl leading-relaxed text-neutral-200">{data.overview || "No overview available."}</p>

            <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              {directors.length > 0 && (
                <div>
                  <dt className="inline text-neutral-500">Director </dt>
                  <dd className="inline">{directors.join(", ")}</dd>
                </div>
              )}
              {creators.length > 0 && (
                <div>
                  <dt className="inline text-neutral-500">Created by </dt>
                  <dd className="inline">{creators.join(", ")}</dd>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <dt className="inline text-neutral-500">Writing </dt>
                  <dd className="inline">{writers.join(", ")}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6">
              <ListButtons mediaType={mediaType} id={id} data={data} title={title} />
            </div>
            <Providers data={data} />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Trailer</h2>
        {trailer ? (
          <div className="aspect-video max-w-4xl overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              key={`${trailer.key}-${trailerStart ?? "0"}`}
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?rel=0${
                trailerStart != null ? `&start=${trailerStart}` : ""
              }`}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No trailer available.</p>
        )}
      </section>

      {trailer && (
        <TrailerMomentSearch
          title={title}
          youtubeKey={trailer.key}
          onSeek={setTrailerStart}
        />
      )}

      {cast.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Cast</h2>
          <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cast.map((c) => (
              <li key={c.credit_id} className="w-24 shrink-0 text-center">
                {c.profile_path ? (
                  <img src={`${PROFILE}${c.profile_path}`} alt={c.name} loading="lazy" className="mx-auto h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-neutral-800 text-2xl text-neutral-500">
                    {c.name[0]}
                  </div>
                )}
                <p className="mt-2 text-xs font-medium leading-tight">{c.name}</p>
                <p className="text-[11px] leading-tight text-neutral-500">{c.character}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Reviews mediaType={mediaType} id={id} title={title} />

      <div className="mt-12">
        <MediaRow title="You might also like" items={data.recommendations?.results} mediaType={mediaType} emptyText="No similar titles found." />
      </div>
    </article>
  );
}
