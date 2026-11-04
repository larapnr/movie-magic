import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import MediaCard from "../components/MediaCard";
import { searchTitles } from "../api/client";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchTitles(q),
    enabled: q.length > 0,
  });

  // TODO (discovery owner): genre and release year filters via discover(), sorting, pagination.
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Results for "{q}"</h1>
      {isLoading && <p className="text-neutral-400">Searching...</p>}
      {isError && <p className="text-red-400">Search failed.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {data?.results?.map((item) => (
          <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
        ))}
      </div>
    </>
  );
}
