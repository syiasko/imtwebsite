import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
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

let authPromise = null;
export const ensureAnonAuth = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        authPromise = null;
        const reason =
          err?.code === "auth/admin-restricted-operation"
            ? "Anonymous sign-in belum diaktifkan di Firebase Console (Authentication → Sign-in method → Anonymous)."
            : err?.message || "Gagal sign-in anonymous.";
        const wrapped = new Error(reason);
        wrapped.code = err?.code;
        throw wrapped;
      });
  }
  return authPromise;
};

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
