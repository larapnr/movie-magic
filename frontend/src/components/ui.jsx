import { useState } from "react";

/** Read-only or interactive 1-5 star rating. */
export function Stars({ value = 0, onChange, size = "text-xl", label = "Rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const interactive = Boolean(onChange);

  return (
    <div
      className={`inline-flex ${size} leading-none`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${value} out of 5 stars`}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = shown >= n ? "full" : shown >= n - 0.5 ? "half" : "empty";
        const star = (
          <span
            className={
              fill === "full"
                ? "text-amber-400"
                : fill === "half"
                  ? "bg-gradient-to-r from-amber-400 from-50% to-neutral-600 to-50% bg-clip-text text-transparent"
                  : "text-neutral-600"
            }
          >
            ★
          </span>
        );
        return interactive ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(n)}
            className="px-0.5 transition hover:scale-110 focus:outline-none"
          >
            {star}
          </button>
        ) : (
          <span key={n} className="px-px">
            {star}
          </span>
        );
      })}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-white ${className}`}
      aria-label="Loading"
    />
  );
}

export function PosterSkeleton() {
  return (
    <div>
      <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-neutral-800" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-neutral-800" />
      <div className="mt-1.5 h-2.5 w-1/3 animate-pulse rounded bg-neutral-800" />
    </div>
  );
}

export function Message({ title, children, tone = "muted", action }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-6 py-10 text-center">
      <p className={`font-medium ${tone === "error" ? "text-red-300" : "text-neutral-200"}`}>{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-neutral-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Pill-style segmented control. options: [{ value, label }] */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-neutral-800/80 p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 transition ${
            value === o.value ? "bg-white font-medium text-black" : "text-neutral-300 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-700 disabled:opacity-50",
  ghost: "text-sm text-neutral-400 transition hover:text-white",
};

export const input =
  "w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none ring-1 ring-transparent transition focus:ring-neutral-500";
