import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase is optional for local development. Without VITE_FIREBASE_API_KEY the app
// still runs (browsing, search, details, YOLO), but sign-in, reviews and lists are disabled.
export const firebaseEnabled = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

export const auth = firebaseEnabled
  ? getAuth(
      initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      })
    )
  : null;

export const googleProvider = firebaseEnabled ? new GoogleAuthProvider() : null;
