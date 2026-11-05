import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/browse", label: "Browse" },
  { to: "/yolo", label: "YOLO" },
  { to: "/scene-finder", label: "Scene Finder" },
];

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm transition ${isActive ? "bg-neutral-800 text-white" : "text-neutral-300 hover:text-white"}`;

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initial = (user.displayName || user.email || "?")[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-semibold text-black"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          <div className="border-b border-neutral-800 px-4 py-3">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <Link to="/my-lists" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-neutral-800">
            My lists
          </Link>
          <Link to="/my-lists?tab=for-you" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-neutral-800">
            For you
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (location.pathname === "/search") setQ(new URLSearchParams(location.search).get("q") || "");
  }, [location]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/" className="shrink-0 text-lg font-bold tracking-tight">
          Movie<span className="text-amber-400">Magic</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </div>
        <form onSubmit={onSubmit} role="search" className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search movies and TV shows"
            aria-label="Search"
            className="w-full rounded-full bg-neutral-800/80 px-4 py-2 text-sm outline-none ring-1 ring-transparent placeholder:text-neutral-500 focus:ring-neutral-600"
          />
        </form>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <NavLink to="/my-lists" className={navClass}>
                My lists
              </NavLink>
              <UserMenu user={user} logout={logout} />
            </>
          ) : (
            !loading && (
              <Link to="/login" className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200">
                Log in
              </Link>
            )
          )}
        </div>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="rounded-md px-2 py-1 text-xl md:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>
      {menuOpen && (
        <div className="border-t border-neutral-800 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navClass}>
                {n.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/my-lists" className={navClass}>
                  My lists
                </NavLink>
                <p className="px-3 pt-2 text-xs text-neutral-500">Signed in as {user.email}</p>
                <button onClick={logout} className="px-3 py-1.5 text-left text-sm text-neutral-400">
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className={navClass}>
                Log in
              </NavLink>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
