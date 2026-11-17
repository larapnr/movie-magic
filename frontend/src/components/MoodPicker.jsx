import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MediaRow from "./MediaRow";
import { Segmented, input } from "./ui";
import { getMoodRecommendations, getMoods } from "../api/client";

/** "What are you in the mood for?" Pick a mood button or type how you feel. Works without an account. */
export default function MoodPicker() {
  const [choice, setChoice] = useState({ mood: "cozy" });
  const [text, setText] = useState("");
  const [type, setType] = useState("movie");

  const moods = useQuery({ queryKey: ["moods"], queryFn: getMoods, staleTime: Infinity });
  const recs = useQuery({
    queryKey: ["moodRecs", choice, type],
    queryFn: () => getMoodRecommendations(choice, type),
  });

  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) setChoice({ feeling: text.trim() });
  };

  const active = recs.data?.mood?.key;

  return (
    <section className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold sm:text-xl">What are you in the mood for?</h2>
        <Segmented
          label="Mood type"
          value={type}
          onChange={setType}
          options={[
            { value: "movie", label: "Movies" },
            { value: "tv", label: "TV" },
          ]}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(moods.data || []).map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setChoice({ mood: m.key });
              setText("");
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active === m.key ? "bg-amber-400 font-medium text-black" : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or tell us how you feel… e.g. “rough day, want something comforting”"
          aria-label="Describe how you feel"
          className={input}
        />
        <button type="submit" className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">
          Go
        </button>
      </form>

      {choice.feeling && recs.data?.mood && (
        <p className="mb-2 text-sm text-neutral-400">
          Sounds like you're in the mood for: <span className="text-amber-300">{recs.data.mood.emoji} {recs.data.mood.label}</span>
        </p>
      )}

      <MediaRow
        title=""
        items={recs.data?.results}
        mediaType={type}
        loading={recs.isLoading}
        error={recs.isError}
        emptyText="No matches for this mood."
      />
    </section>
  );
}
