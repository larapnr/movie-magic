import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { btn, input } from "../components/ui";

const FIREBASE_ERRORS = {
  "auth/invalid-credential": "Wrong email or password",
  "auth/wrong-password": "Wrong email or password",
  "auth/user-not-found": "Wrong email or password",
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/weak-password": "Password must be at least 6 characters",
  "auth/popup-closed-by-user": "Google sign-in was cancelled",
};

export default function Login() {
  const { user, login, signup, loginWithGoogle, mode: authMode } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from;
  const dest = from ? `${from.pathname}${from.search || ""}` : "/";

  useEffect(() => setError(""), [mode]);

  if (user && !busy) return <Navigate to={dest} replace />;

  const run = async (fn, welcome) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      toast(welcome);
      navigate(dest, { replace: true });
    } catch (e) {
      setError(FIREBASE_ERRORS[e.code] || errorMessage(e).replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") run(() => login(email, password), "Welcome back!");
    else run(() => signup(email, password, name.trim()), "Account created. Welcome!");
  };

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {mode === "login" ? "Log in to review titles and manage your lists." : "Rate, review and save titles you love."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          {mode === "signup" && (
            <label className="text-sm">
              <span className="mb-1 block text-neutral-400">Display name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Shown on your reviews" className={input} autoComplete="nickname" />
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="email" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "signup" && <span className="mt-1 block text-xs text-neutral-500">At least 6 characters</span>}
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button disabled={busy} className={`${btn.primary} mt-2 py-2.5`}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        {loginWithGoogle && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
              <span className="h-px flex-1 bg-neutral-800" />
              or
              <span className="h-px flex-1 bg-neutral-800" />
            </div>
            <button onClick={() => run(loginWithGoogle, "Welcome!")} disabled={busy} className={`${btn.secondary} w-full py-2.5`}>
              Continue with Google
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-neutral-400">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-medium text-white underline-offset-2 hover:underline">
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
      {authMode === "local" && (
        <p className="mt-4 text-center text-xs text-neutral-600">
          Local mode: accounts are stored on this backend only. <Link to="/" className="underline">Back home</Link>
        </p>
      )}
    </div>
  );
}
