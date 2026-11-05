import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchTitles } from "../api/client";
import { MediaGrid } from "../components/MediaRow";
import { Message, Segmented, Spinner, btn } from "../components/ui";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const type = ["movie", "tv"].includes(params.get("type")) ? params.get("type") : "multi";

  const query = useInfiniteQuery({
    queryKey: ["search", q, type],
    queryFn: ({ pageParam }) => searchTitles(q, type, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined),
    enabled: q.length > 0,
  });

  const items = (query.data?.pages.flatMap((p) => p.results) || []).filter((i) => i.media_type !== "person");
  const setType = (t) => {
    const next = new URLSearchParams(params);
    if (t === "multi") next.delete("type");
    else next.set("type", t);
    setParams(next, { replace: true });
  };

  if (!q)
    return (
      <Message title="Search for a movie or TV show" action={<Link to="/browse" className={btn.secondary}>Or browse by genre</Link>}>
        Use the search bar at the top of the page.
      </Message>
    );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Results for <span className="text-amber-400">"{q}"</span>
        </h1>
        <Segmented
          label="Result type"
          value={type}
          onChange={setType}
          options={[
            { value: "multi", label: "All" },
            { value: "movie", label: "Movies" },
            { value: "tv", label: "TV" },
          ]}
        />
      </div>

      {query.isError ? (
        <Message title="Search failed" tone="error">
          Check that the backend is running and try again.
        </Message>
      ) : !query.isLoading && items.length === 0 ? (
        <Message title={`No results for "${q}"`} action={<Link to="/browse" className={btn.secondary}>Browse instead</Link>}>
          Check the spelling or try a shorter title.
        </Message>
      ) : (
        <MediaGrid items={items} mediaType={type === "multi" ? undefined : type} loading={query.isLoading} showType={type === "multi"} />
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
