import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteReview, errorMessage, getReviewSummary, getReviews, saveReview } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Stars, btn } from "./ui";

const LABELS = ["", "Poor", "Meh", "Good", "Great", "Masterpiece"];
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function ReviewForm({ mediaType, id, existing, onDone }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [text, setText] = useState(existing?.text || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError("Pick a star rating first.");
    setSaving(true);
    setError("");
    try {
      await saveReview(mediaType, id, { rating, text: text.trim() });
      qc.invalidateQueries({ queryKey: ["reviews", mediaType, id] });
      toast(existing ? "Review updated" : "Review posted");
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Stars value={rating} onChange={setRating} size="text-3xl" label="Your rating" />
        <span className="text-sm text-neutral-400">{LABELS[rating] || "Your rating"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What did you think? (optional)"
        className="mt-3 w-full resize-y rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-transparent placeholder:text-neutral-500 focus:ring-neutral-600"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-neutral-500">{text.length}/2000</span>
        <div className="flex gap-2">
          {existing && (
            <button type="button" onClick={onDone} className={btn.secondary}>
              Cancel
            </button>
          )}
          <button disabled={saving} className={btn.primary}>
            {saving ? "Saving..." : existing ? "Save changes" : "Post review"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}

function ReviewCard({ review, mine, onEdit, onDelete }) {
  const edited = review.updated_at && review.updated_at !== review.created_at;
  return (
    <li className={`rounded-xl border p-4 ${mine ? "border-amber-400/40 bg-amber-400/5" : "border-neutral-800 bg-neutral-900/40"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold">
            {(review.display_name || "?")[0].toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-medium">
              <Link
                to={`/users/${review.uid}`}
                className="transition hover:text-amber-400 hover:underline"
              >
                {review.display_name || "Movie Magic User"}
              </Link>

              {mine && (
                <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                  You
                </span>
              )}
            </p>
            <p className="text-xs text-neutral-500">
              {fmtDate(review.created_at)}
              {edited && " · edited"}
            </p>
          </div>
        </div>
        <Stars value={review.rating} size="text-base" />
      </div>
      {review.text && <p className="mt-3 whitespace-pre-line text-sm text-neutral-200">{review.text}</p>}
      {mine && (
        <div className="mt-3 flex gap-4">
          <button onClick={onEdit} className={btn.ghost}>
            Edit
          </button>
          <button onClick={onDelete} className="text-sm text-neutral-400 transition hover:text-red-400">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

/** Community ratings (separate from TMDb ratings): summary, own review form, and the review list. */
export default function Reviews({ mediaType, id, title }) {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ["reviews", mediaType, id],
    queryFn: () => getReviews(mediaType, id),
  });

  // Prefix ["reviews", mediaType, id] means invalidating the list also refreshes the summary.
  const { data: summary } = useQuery({
    queryKey: ["reviews", mediaType, id, "summary"],
    queryFn: () => getReviewSummary(mediaType, id),
  });

  const mine = user && reviews.find((r) => r.uid === user.uid);
  const others = reviews.filter((r) => r !== mine);
  const count = summary?.count ?? reviews.length;
  const average = summary?.average ?? (count ? reviews.reduce((s, r) => s + r.rating, 0) / count : null);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  const remove = async () => {
    if (!window.confirm("Delete your review?")) return;
    try {
      await deleteReview(mediaType, id);
      qc.invalidateQueries({ queryKey: ["reviews", mediaType, id] });
      toast("Review deleted");
    } catch (err) {
      toast(errorMessage(err, "Couldn't delete your review."), "error");
    }
  };

  return (
    <section className="mt-12" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-4 text-xl font-semibold">
        Community reviews
      </h2>

      {isError ? (
        <p className="text-sm text-red-400">Couldn't load reviews.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Movie Magic rating</p>
            {count ? (
              <>
                <p className="mt-1 text-4xl font-bold">
                  {average.toFixed(1)}
                  <span className="text-base font-normal text-neutral-500"> / 5</span>
                </p>
                <Stars value={Math.round(average * 2) / 2} size="text-lg" />
                <p className="mt-1 text-xs text-neutral-500">
                  {count} {count === 1 ? "review" : "reviews"}
                </p>
                <ul className="mt-4 space-y-1">
                  {dist.map(({ n, c }) => (
                    <li key={n} className="flex items-center gap-2 text-xs text-neutral-400">
                      <span className="w-3">{n}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${(c / count) * 100}%` }} />
                      </div>
                      <span className="w-4 text-right">{c}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-neutral-400">{isLoading ? "Loading..." : "No ratings yet. Be the first!"}</p>
            )}
          </div>

          <div className="space-y-4">
            {!user ? (
              <div className="rounded-xl border border-dashed border-neutral-700 p-4 text-sm text-neutral-400">
                <Link to="/login" state={{ from: location }} className="font-medium text-white underline underline-offset-2">
                  Log in
                </Link>{" "}
                to rate and review {title}.
              </div>
            ) : !mine || editing ? (
              <ReviewForm key={mine?.updated_at || "new"} mediaType={mediaType} id={id} existing={mine} onDone={() => setEditing(false)} />
            ) : null}

            <ul className="space-y-3">
              {mine && !editing && <ReviewCard review={mine} mine onEdit={() => setEditing(true)} onDelete={remove} />}
              {others.map((r) => (
                <ReviewCard key={r.uid} review={r} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
