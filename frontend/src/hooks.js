import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToList, getGenres, getList, removeFromList } from "./api/client";
import { useAuth } from "./context/AuthContext";

export const LISTS = [
  { key: "favorite", label: "Favorites", icon: "♥" },
  { key: "watchlist", label: "Watchlist", icon: "+" },
  { key: "watched", label: "Watched", icon: "✓" },
];

/** Genre list for movie or tv, plus an id -> name lookup. Cached for the session. */
export function useGenres(type = "movie") {
  const { data } = useQuery({
    queryKey: ["genres", type],
    queryFn: () => getGenres(type),
    staleTime: Infinity,
  });
  const genres = data?.genres || [];
  const byId = Object.fromEntries(genres.map((g) => [g.id, g.name]));
  return { genres, byId };
}

/** The signed-in user's three lists, with membership checks and add/remove. */
export function useLists() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const results = useQueries({
    queries: LISTS.map((l) => ({
      queryKey: ["list", user?.uid, l.key],
      queryFn: () => getList(l.key),
      enabled: !!user,
    })),
  });

  const items = Object.fromEntries(LISTS.map((l, i) => [l.key, results[i].data || []]));
  const has = (list, mediaType, id) =>
    items[list].some((it) => it.media_type === mediaType && String(it.tmdb_id) === String(id));

  const refresh = (list) => {
    qc.invalidateQueries({ queryKey: ["list", user?.uid, list] });
    qc.invalidateQueries({ queryKey: ["forYou"] });
  };

  const add = async (list, mediaType, id, item) => {
    await addToList(list, mediaType, id, item);
    refresh(list);
  };
  const remove = async (list, mediaType, id) => {
    await removeFromList(list, mediaType, id);
    refresh(list);
  };

  return {
    items,
    has,
    add,
    remove,
    isLoading: results.some((r) => r.isLoading),
  };
}

export const yearOf = (item) => (item.release_date || item.first_air_date || "").slice(0, 4);
export const titleOf = (item) => item.title || item.name;
export const typeOf = (item, fallback) =>
  fallback || item.media_type || (item.title !== undefined ? "movie" : "tv");
