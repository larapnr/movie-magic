import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from?.pathname || "/";

  const run = async (fn) => {
    setError("");
    try {
      await fn();
      navigate(dest, { replace: true });
    } catch (e) {
      setError(e.message.replace("Firebase: ", ""));
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    run(() => (mode === "login" ? login(email, password) : signup(email, password)));
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-semibold">{mode === "login" ? "Log in" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded bg-neutral-800 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded bg-neutral-800 px-3 py-2 text-sm"
        />
        <button className="rounded bg-white px-3 py-2 text-sm font-medium text-black">
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      <button onClick={() => run(loginWithGoogle)} className="mt-3 w-full rounded bg-neutral-800 px-3 py-2 text-sm">
        Continue with Google
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 text-sm text-neutral-400 hover:text-white"
      >
        {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
      </button>
    </div>
  );
}
