import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { errorMessage, getMyRecommendations } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MediaGrid } from "../components/MediaRow";
import { Message, Segmented, btn } from "../components/ui";
import { LISTS, useGenres, useLists } from "../hooks";

const TABS = [...LISTS.map((l) => ({ key: l.key, label: l.label })), { key: "for-you", label: "For you" }];
const EMPTY = {
  favorite: "Tap ♥ Favorites on any title to keep it here.",
  watchlist: "Add titles you want to watch later.",
  watched: "Mark titles as watched to keep track.",
};

function ForYou() {
  const { user } = useAuth();
  const [type, setType] = useState("movie");
  const { byId } = useGenres(type);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["forYou", user?.uid, type],
    queryFn: () => getMyRecommendations(type),
    retry: false,
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {data?.based_on?.liked_genres?.length
            ? `Based on what you save and rate: ${data.based_on.liked_genres.map((g) => byId[g]).filter(Boolean).join(", ")}`
            : "Picks based on what you save and how you rate it."}
          {data?.based_on?.avoided_genres?.length > 0 &&
            ` · skipping ${data.based_on.avoided_genres.map((g) => byId[g]).filter(Boolean).join(", ")}`}
        </p>
        <Segmented
          label="Recommendation type"
          value={type}
          onChange={setType}
          options={[
            { value: "movie", label: "Movies" },
            { value: "tv", label: "TV" },
          ]}
        />
      </div>
      {isError ? (
        error?.response?.status === 404 ? (
          <Message title="Nothing to go on yet" action={<Link to="/browse" className={btn.primary}>Find something to save</Link>}>
            Save a few titles or rate them with stars and we'll recommend more like them.
          </Message>
        ) : (
          <Message title="Couldn't load recommendations" tone="error">
            {errorMessage(error)}
          </Message>
        )
      ) : (
        <MediaGrid
          items={data?.results}
          mediaType={type}
          loading={isLoading}
          renderFooter={(item) => item.reason && <p className="mt-1 text-xs text-amber-300/80">{item.reason}</p>}
        />
      )}
    </>
  );
}

export default function MyLists() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "favorite";
  const { user } = useAuth();
  const lists = useLists();
  const toast = useToast();

  const remove = async (item) => {
    try {
      await lists.remove(tab, item.media_type, item.tmdb_id);
      toast(`Removed ${item.title}`);
    } catch (err) {
      toast(errorMessage(err, "Couldn't remove it."), "error");
    }
  };

  const items = tab === "for-you" ? [] : lists.items[tab];

  return (
    <>
      <h1 className="text-2xl font-bold">My lists</h1>
      <p className="mb-6 text-sm text-neutral-400">Signed in as {user.email}</p>

      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams(t.key === "favorite" ? {} : { tab: t.key }, { replace: true })}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 pb-3 text-sm transition ${
              tab === t.key ? "border-amber-400 font-medium text-white" : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            {t.label}
            {t.key !== "for-you" && (
              <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">{lists.items[t.key].length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "for-you" ? (
        <ForYou />
      ) : !lists.isLoading && items.length === 0 ? (
        <Message title="Nothing here yet" action={<Link to="/browse" className={btn.primary}>Browse titles</Link>}>
          {EMPTY[tab]}
        </Message>
      ) : (
        <MediaGrid
          items={items.map((i) => ({ ...i, id: i.tmdb_id }))}
          loading={lists.isLoading}
          showType
          renderFooter={(item) => (
            <button onClick={() => remove(item)} className="mt-1 text-xs text-neutral-500 transition hover:text-red-400">
              Remove
            </button>
          )}
        />
      )}
    </>
  );
}
