import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, searchTrailerScenes } from "../api/client";
import { Message, Spinner, btn, input } from "../components/ui";

const EXAMPLES = ["car chase in the rain", "spaceship explosion", "sword fight on a rooftop", "first kiss at sunset"];
const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Scene level trailer search. The backend returns 501 until the prototype is wired in;
 * the result view already follows the planned response shape in docs/API_CONTRACT.md.
 */
export default function SceneFinder() {
  const [q, setQ] = useState("");
  const [state, setState] = useState({ status: "idle" });
  const [active, setActive] = useState(0);

  const search = async (text) => {
    const query = (text ?? q).trim();
    if (!query) return;
    setQ(query);
    setState({ status: "loading" });
    try {
      const data = await searchTrailerScenes(query);
      setActive(0);
      setState({ status: "done", data });
    } catch (err) {
      setState({ status: err.response?.status === 501 ? "unavailable" : "error", message: errorMessage(err) });
    }
  };

  const matches = state.data?.matches || [];
  const current = matches[active];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Beta</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Scene Finder</h1>
        <p className="mt-2 text-neutral-400">Describe a moment and jump straight to it in a trailer.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mt-6 flex gap-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g. "car chase in the rain"' aria-label="Describe a scene" className={`${input} py-3`} />
        <button disabled={state.status === "loading"} className={`${btn.primary} px-6`}>
          {state.status === "loading" ? <Spinner className="border-neutral-300 border-t-black" /> : "Find"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => search(ex)} className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-700">
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-10">
        {state.status === "unavailable" && (
          <Message title="Scene Finder is coming soon" action={<Link to="/yolo" className={btn.secondary}>Try YOLO meanwhile</Link>}>
            The search engine behind this page isn't connected yet. Once it is, results will appear here with the trailer
            starting at the matching moment.
          </Message>
        )}
        {state.status === "error" && <Message title="Search failed" tone="error">{state.message}</Message>}
        {state.status === "done" && matches.length === 0 && <Message title="No matching scenes">Try describing it differently.</Message>}
        {current && (
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
            <div className="aspect-video bg-black">
              <iframe
                key={`${current.youtube_key}-${current.start_seconds}`}
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${current.youtube_key}?start=${Math.floor(current.start_seconds)}${
                  current.end_seconds ? `&end=${Math.ceil(current.end_seconds)}` : ""
                }&autoplay=1`}
                title={`${current.title} scene`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <ul className="divide-y divide-neutral-800">
              {matches.map((m, i) => (
                <li key={`${m.youtube_key}-${m.start_seconds}`}>
                  <button
                    onClick={() => setActive(i)}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm transition ${
                      i === active ? "bg-neutral-800" : "hover:bg-neutral-800/50"
                    }`}
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {ts(m.start_seconds)}
                      {m.end_seconds ? `–${ts(m.end_seconds)}` : ""}
                      {m.score != null && <span className="ml-3 text-amber-300">{Math.round(m.score * 100)}% match</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
