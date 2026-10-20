import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { connectAuthEmulator, getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDdki2bvmzBwhVL3vW4OOmw9X7ScuLbwHo",
  authDomain: "imtwebsite-ddf59.firebaseapp.com",
  projectId: "imtwebsite-ddf59",
  storageBucket: "imtwebsite-ddf59.firebasestorage.app",
  messagingSenderId: "222868474268",
  appId: "1:222868474268:web:1bdef174bc2c461e5e2059",
  measurementId: "G-22ZZZ5PFEJ",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// `VITE_FIREBASE_EMULATORS=1 npm run dev` talks to `firebase emulators:start`
// instead of production, for testing logins and rules locally. The MCP server
// (mcp/server.mjs) imports this file under Node, where the flag comes from
// process.env instead of Vite.
export const USE_EMULATORS =
  (import.meta.env?.VITE_FIREBASE_EMULATORS ??
    globalThis.process?.env?.VITE_FIREBASE_EMULATORS) === "1";
export const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
if (USE_EMULATORS) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
}

// Staff log in with a username; Firebase Auth needs an email, so each
// username maps to an address on the project's own auth domain. No mail is
// ever sent to it.
export const STAFF_EMAIL_DOMAIN = "imtwebsite-ddf59.firebaseapp.com";
export const staffEmail = (username) =>
  `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;

let analyticsPromise = null;
const getAnalyticsLazy = async () => {
  if (typeof window === "undefined") return null;
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((ok) => (ok ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
};

export const trackEvent = async (eventName, params = {}) => {
  try {
    const analytics = await getAnalyticsLazy();
    if (analytics) logEvent(analytics, eventName, params);
  } catch {
    // best-effort
  }
};

export const trackPageView = (pathname, title) =>
  trackEvent("page_view", {
    page_path: pathname,
    page_location: typeof window !== "undefined" ? window.location.href : "",
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
  });
