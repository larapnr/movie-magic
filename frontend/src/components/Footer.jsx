import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-neutral-800/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row">
        <nav className="flex gap-4">
          <Link to="/browse" className="hover:text-white">Browse</Link>
          <Link to="/yolo" className="hover:text-white">YOLO</Link>
          <Link to="/scene-finder" className="hover:text-white">Scene Finder</Link>
        </nav>
        {/* TMDb requires this attribution. https://www.themoviedb.org/about/logos-attribution */}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-neutral-300">
          <span className="rounded bg-gradient-to-r from-[#90cea1] to-[#01b4e4] px-1.5 py-0.5 text-[10px] font-bold text-[#0d253f]">TMDB</span>
          This product uses the TMDb API but is not endorsed or certified by TMDb.
        </a>
      </div>
    </footer>
  );
}
