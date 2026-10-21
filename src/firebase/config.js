// Firebase now only serves the signage greeting (settings/greeting, read by
// the TV app) and Analytics. Catalog data, auth and media moved to Supabase/R2.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";

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
