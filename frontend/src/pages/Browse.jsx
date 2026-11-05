import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { discover } from "../api/client";
import { MediaGrid } from "../components/MediaRow";
import { Message, Segmented, Spinner, btn } from "../components/ui";
import { useGenres } from "../hooks";

const SORTS = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "vote_average.desc", label: "Highest rated" },
  { value: "primary_release_date.desc", label: "Newest", tv: "first_air_date.desc" },
  { value: "primary_release_date.asc", label: "Oldest", tv: "first_air_date.asc" },
  { value: "revenue.desc", label: "Box office", movieOnly: true },
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 2 - 1950 }, (_, i) => THIS_YEAR + 1 - i);

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") === "tv" ? "tv" : "movie";
  const genres = (params.get("genre") || "").split(",").filter(Boolean);
  const year = params.get("year") || "";
  const sortKey = params.get("sort") || "popularity.desc";
  const { genres: genreList } = useGenres(type);

  const sort = SORTS.find((s) => s.value === sortKey) || SORTS[0];
  const sortBy = type === "tv" ? sort.tv || sort.value : sort.value;

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const toggleGenre = (id) => {
    const s = String(id);
    update({ genre: (genres.includes(s) ? genres.filter((g) => g !== s) : [...genres, s]).join(",") });
  };

  const query = useInfiniteQuery({
    queryKey: ["discover", type, genres.join(","), year, sortBy],
    queryFn: ({ pageParam }) =>
      discover({
        type,
        genre: genres.join(",") || undefined,
        year: year || undefined,
        sort_by: sortBy,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.results) || [];
  const total = query.data?.pages[0]?.total_results;
  const filtersOn = genres.length > 0 || year || sortKey !== "popularity.desc";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Browse</h1>
          <p className="text-sm text-neutral-400">
            {total != null ? `${total.toLocaleString()} titles` : "Filter by genre, year and more"}
          </p>
        </div>
        <Segmented
          label="Type"
          value={type}
          onChange={(v) => update({ type: v === "movie" ? "" : v, genre: "" })}
          options={[
            { value: "movie", label: "Movies" },
            { value: "tv", label: "TV shows" },
          ]}
        />
      </div>

      <div className="mb-6 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Genres">
          {genreList.map((g) => {
            const on = genres.includes(String(g.id));
            return (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  on ? "bg-amber-400 font-medium text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            {type === "tv" ? "First aired" : "Released"}
            <select
              value={year}
              onChange={(e) => update({ year: e.target.value })}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none"
            >
              <option value="">Any year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            Sort
            <select
              value={sortKey}
              onChange={(e) => update({ sort: e.target.value === "popularity.desc" ? "" : e.target.value })}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 outline-none"
            >
              {SORTS.filter((s) => !(s.movieOnly && type === "tv")).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {filtersOn && (
            <button onClick={() => update({ genre: "", year: "", sort: "" })} className={btn.ghost}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {query.isError ? (
        <Message title="Couldn't load titles" tone="error">
          Try again in a moment.
        </Message>
      ) : !query.isLoading && items.length === 0 ? (
        <Message title="No matches">Try fewer genres or a different year.</Message>
      ) : (
        <MediaGrid items={items} mediaType={type} loading={query.isLoading} />
      )}

      {query.hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className={btn.secondary}>
            {query.isFetchingNextPage ? <Spinner /> : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
