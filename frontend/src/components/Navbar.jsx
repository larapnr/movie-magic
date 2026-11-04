import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-900">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-bold">
          Movie Magic
        </Link>
        <form onSubmit={onSubmit} className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search movies and TV shows"
            className="w-full rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </form>
        <Link to="/yolo" className="text-sm hover:underline">
          YOLO
        </Link>
        {user ? (
          <>
            <Link to="/my-lists" className="text-sm hover:underline">
              My lists
            </Link>
            <button onClick={logout} className="text-sm text-neutral-400 hover:text-white">
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm hover:underline">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
