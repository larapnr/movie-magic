import { useRef } from "react";
import MediaCard from "./MediaCard";
import { PosterSkeleton } from "./ui";

/** Horizontally scrolling row of posters with arrow buttons. */
export default function MediaRow({ title, items, mediaType, loading, error, action, showType, emptyText }) {
  const scroller = useRef(null);
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  const list = (items || []).filter((i) => (mediaType || i.media_type) !== "person");

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          <div className="hidden gap-1 sm:flex">
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="rounded-full bg-neutral-800 px-2.5 py-1 text-sm hover:bg-neutral-700">
              ‹
            </button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="rounded-full bg-neutral-800 px-2.5 py-1 text-sm hover:bg-neutral-700">
              ›
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-400">Couldn't load this row.</p>
      ) : !loading && list.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyText || "Nothing to show."}</p>
      ) : (
        <div
          ref={scroller}
          className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="w-32 shrink-0 sm:w-40">
                  <PosterSkeleton />
                </div>
              ))
            : list.slice(0, 20).map((item) => (
                <div key={`${item.media_type || mediaType}-${item.id}`} className="w-32 shrink-0 snap-start sm:w-40">
                  <MediaCard item={item} mediaType={mediaType} showType={showType} />
                </div>
              ))}
        </div>
      )}
    </section>
  );
}

/** Responsive grid of posters, used by Search, Browse and lists. */
export function MediaGrid({ items, mediaType, loading, showType, renderFooter }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {(items || []).map((item) => (
        <MediaCard
          key={`${item.media_type || mediaType}-${item.id}`}
          item={item}
          mediaType={mediaType}
          showType={showType}
          footer={renderFooter?.(item)}
        />
      ))}
      {loading && Array.from({ length: 12 }, (_, i) => <PosterSkeleton key={`s${i}`} />)}
    </div>
  );
}
