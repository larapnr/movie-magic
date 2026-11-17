import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import MediaRow from "../components/MediaRow";
import MoodPicker from "../components/MoodPicker";
import { BACKDROP } from "../components/MediaCard";
import { Message, Segmented, btn } from "../components/ui";
import { getGenreRecommendations, getMyRecommendations, getPopular, getTrending, getUpcoming } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { titleOf, typeOf, useGenres, yearOf } from "../hooks";

function Hero({ item, genreNames }) {
  if (!item) return <div className="-mx-4 mb-10 h-[52vh] min-h-80 animate-pulse bg-neutral-900 sm:mx-0 sm:rounded-2xl" />;
  const type = typeOf(item);
  return (
    <section className="relative -mx-4 mb-10 overflow-hidden sm:mx-0 sm:rounded-2xl">
      {item.backdrop_path && (
        <img src={`${BACKDROP}${item.backdrop_path}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-neutral-950/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/30 to-transparent" />
      <div className="relative flex min-h-80 flex-col justify-end px-4 pb-8 pt-40 sm:h-[52vh] sm:px-10 sm:pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">#1 trending today</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{titleOf(item)}</h1>
        <p className="mt-2 text-sm text-neutral-300">
          {[yearOf(item), type === "tv" ? "TV series" : "Movie", genreNames].filter(Boolean).join(" · ")}
          {item.vote_average > 0 && <span className="ml-2 text-amber-300">★ {item.vote_average.toFixed(1)}</span>}
        </p>
        <p className="mt-3 line-clamp-3 max-w-xl text-sm text-neutral-200 sm:text-base">{item.overview}</p>
        <div className="mt-5 flex gap-3">
          <Link to={`/${type}/${item.id}`} className={btn.primary}>
            ▶ Details & trailer
          </Link>
          <Link to="/yolo" className={btn.secondary}>
            Surprise me
          </Link>
        </div>
      </div>
    </section>
  );
}

const SPOTLIGHT = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 878, name: "Science Fiction" },
  { id: 27, name: "Horror" },
  { id: 16, name: "Animation" },
];

export default function Home() {
  const { user } = useAuth();
  const [trendWindow, setTrendWindow] = useState("day");
  const [popularType, setPopularType] = useState("movie");
  const [spotlight, setSpotlight] = useState(SPOTLIGHT[0].id);
  const { byId: movieGenres } = useGenres("movie");
  const { byId: tvGenres } = useGenres("tv");

  const hero = useQuery({ queryKey: ["trending", "day"], queryFn: () => getTrending("day") });
  const trending = useQuery({ queryKey: ["trending", trendWindow], queryFn: () => getTrending(trendWindow) });
  const popular = useQuery({ queryKey: ["popular", popularType], queryFn: () => getPopular(popularType) });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: () => getUpcoming() });
  const byGenre = useQuery({
    queryKey: ["genreRecs", spotlight],
    queryFn: () => getGenreRecommendations(String(spotlight), "movie"),
  });
  const forYou = useQuery({
    queryKey: ["forYou", user?.uid, "movie"],
    queryFn: () => getMyRecommendations("movie"),
    enabled: !!user,
    retry: false,
  });

  if (hero.isError && trending.isError)
    return (
      <Message title="Couldn't load titles" tone="error">
        Make sure the backend is running on port 8000 and TMDB_API_KEY is set in backend/.env.
      </Message>
    );

  const heroItem = hero.data?.results?.find((r) => r.backdrop_path && r.media_type !== "person");
  const heroGenres = heroItem?.genre_ids
    ?.map((id) => movieGenres[id] || tvGenres[id])
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return (
    <>
      <Hero item={heroItem} genreNames={heroGenres} />

      {user && forYou.data?.results?.length > 0 && (
        <MediaRow
          title={`For you, ${user.displayName}`}
          items={forYou.data.results}
          mediaType="movie"
          action={
            <Link to="/my-lists?tab=for-you" className="text-sm text-neutral-400 hover:text-white">
              See all
            </Link>
          }
        />
      )}

      <MoodPicker />

      <MediaRow
        title="Trending"
        items={trending.data?.results}
        loading={trending.isLoading}
        error={trending.isError}
        showType
        action={
          <Segmented
            label="Trending window"
            value={trendWindow}
            onChange={setTrendWindow}
            options={[
              { value: "day", label: "Today" },
              { value: "week", label: "This week" },
            ]}
          />
        }
      />

      <MediaRow
        title="Popular"
        items={popular.data?.results}
        mediaType={popularType}
        loading={popular.isLoading}
        error={popular.isError}
        action={
          <Segmented
            label="Popular type"
            value={popularType}
            onChange={setPopularType}
            options={[
              { value: "movie", label: "Movies" },
              { value: "tv", label: "TV" },
            ]}
          />
        }
      />

      <MediaRow
        title="Coming soon"
        items={upcoming.data?.results}
        mediaType="movie"
        loading={upcoming.isLoading}
        error={upcoming.isError}
      />

      <MediaRow
        title="Top rated by genre"
        items={byGenre.data?.results}
        mediaType="movie"
        loading={byGenre.isLoading}
        error={byGenre.isError}
        action={
          <select
            value={spotlight}
            onChange={(e) => setSpotlight(Number(e.target.value))}
            aria-label="Genre"
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-sm outline-none"
          >
            {SPOTLIGHT.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        }
      />

      {!user && (
        <section className="mb-10 rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Make it yours</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-400">
            Create a free account to rate and review titles, keep a watchlist, and get picks based on what you save.
          </p>
          <Link to="/login?mode=signup" className={`${btn.primary} mt-4`}>
            Create account
          </Link>
        </section>
      )}
    </>
  );
}
