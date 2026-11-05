import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { auth, googleProvider, firebaseEnabled } from "../firebase";
import { configureAuth, getMe, localLogin, localSignup } from "../api/client";

/**
 * Two sign-in systems behind one interface:
 * - Firebase, when VITE_FIREBASE_API_KEY is set (the backend must also have Firebase configured).
 * - Local mode otherwise: email/password accounts stored by the backend in SQLite.
 *
 * user = { uid, email, displayName } or null.
 */
const AuthContext = createContext(null);
const TOKEN_KEY = "mm_token";

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
};

let memoryToken = null;

const fromFirebase = (u) => u && { uid: u.uid, email: u.email, displayName: u.displayName || u.email?.split("@")[0] };
const fromLocal = (u) => u && { uid: u.uid, email: u.email, displayName: u.display_name };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const clearUserData = useCallback(() => {
    qc.removeQueries({ queryKey: ["list"] });
    qc.removeQueries({ queryKey: ["forYou"] });
  }, [qc]);

  const localLogout = useCallback(() => {
    memoryToken = null;
    writeToken(null);
    setUser(null);
    clearUserData();
  }, [clearUserData]);

  // Wire the API client to whichever auth system is active.
  useEffect(() => {
    if (firebaseEnabled) {
      configureAuth(async () => auth.currentUser?.getIdToken() ?? null, () => {});
    } else {
      configureAuth(async () => memoryToken, localLogout);
    }
  }, [localLogout]);

  // Restore the session.
  useEffect(() => {
    if (firebaseEnabled) {
      let unsub = () => {};
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(fromFirebase(u));
          setLoading(false);
        });
      });
      return () => unsub();
    }
    memoryToken = readToken();
    if (!memoryToken) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(fromLocal(u)))
      .catch(() => localLogout())
      .finally(() => setLoading(false));
  }, [localLogout]);

  const value = useMemo(() => {
    const startLocalSession = ({ token, user: u }) => {
      memoryToken = token;
      writeToken(token);
      setUser(fromLocal(u));
      clearUserData();
    };

    if (firebaseEnabled) {
      const fb = () => import("firebase/auth");
      return {
        user,
        loading,
        mode: "firebase",
        login: async (email, password) => (await fb()).signInWithEmailAndPassword(auth, email, password),
        signup: async (email, password, displayName) => {
          const m = await fb();
          const cred = await m.createUserWithEmailAndPassword(auth, email, password);
          if (displayName) await m.updateProfile(cred.user, { displayName });
          setUser(fromFirebase(cred.user));
        },
        loginWithGoogle: async () => (await fb()).signInWithPopup(auth, googleProvider),
        logout: async () => {
          await (await fb()).signOut(auth);
          clearUserData();
        },
      };
    }
    return {
      user,
      loading,
      mode: "local",
      login: async (email, password) => startLocalSession(await localLogin({ email, password })),
      signup: async (email, password, displayName) =>
        startLocalSession(await localSignup({ email, password, display_name: displayName || null })),
      loginWithGoogle: null,
      logout: async () => localLogout(),
    };
  }, [user, loading, clearUserData, localLogout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
