import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getList, removeFromList } from "../api/client";
import { IMG } from "../components/MediaCard";

const TABS = [
  { key: "favorite", label: "Favorites" },
  { key: "watchlist", label: "Watchlist" },
  { key: "watched", label: "Watched" },
];

export default function MyLists() {
  const [tab, setTab] = useState("favorite");
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["list", tab], queryFn: () => getList(tab) });

  const remove = async (item) => {
    await removeFromList(tab, item.media_type, item.tmdb_id);
    qc.invalidateQueries({ queryKey: ["list", tab] });
  };

  // TODO (accounts owner): "For you" tab using getMyRecommendations() once recommendations are ready.
  return (
    <>
      <div className="mb-4 flex gap-4 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm ${tab === t.key ? "border-b-2 border-white font-medium" : "text-neutral-400"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-neutral-400">Loading...</p>}
      {!isLoading && data.length === 0 && <p className="text-neutral-400">Nothing here yet.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
        {data.map((item) => (
          <div key={`${item.media_type}-${item.tmdb_id}`}>
            <Link to={`/${item.media_type}/${item.tmdb_id}`}>
              {item.poster_path ? (
                <img src={`${IMG}${item.poster_path}`} alt={item.title} className="aspect-[2/3] w-full rounded object-cover" />
              ) : (
                <div className="aspect-[2/3] w-full rounded bg-neutral-800" />
              )}
            </Link>
            <p className="mt-2 truncate text-sm">{item.title}</p>
            <button onClick={() => remove(item)} className="text-xs text-neutral-500 hover:text-red-400">
              Remove
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
