import { useCallback, useEffect, useState } from "react";
import { useSignageData } from "./firebase/data";
import VehicleList from "./components/VehicleList";
import VehicleDetail from "./components/VehicleDetail";
import Splash from "./components/Splash";
import Screensaver from "./components/Screensaver";

// Idle ms before the detail view auto-returns to the list. 0 disables.
const DETAIL_IDLE_TIMEOUT = 60_000;

export default function App() {
  const { grouped, vehicles, company, loading, error } = useSignageData();
  const [view, setView] = useState({ type: "list" });
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splashShown"));
  const [showScreensaver, setShowScreensaver] = useState(false);

  useEffect(() => {
    if (!loading && showSplash) {
      sessionStorage.setItem("splashShown", "true");
      setShowSplash(false);
    }
  }, [loading, showSplash]);

  const openDetail = useCallback((vehicleId) => {
    setView({ type: "detail", vehicleId });
    window.scrollTo({ top: 0 });
  }, []);

  const closeDetail = useCallback(() => {
    setView({ type: "list" });
    window.scrollTo({ top: 0 });
  }, []);

  // Auto-return to list after idle on the detail view.
  useEffect(() => {
    if (view.type !== "detail" || DETAIL_IDLE_TIMEOUT <= 0) return undefined;
    let timeoutId = setTimeout(closeDetail, DETAIL_IDLE_TIMEOUT);
    const reset = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(closeDetail, DETAIL_IDLE_TIMEOUT);
    };
    const events = ["pointerdown", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [view.type, closeDetail]);

  // Global screensaver idle timer.
  const screensaverTimeoutMs = (company?.screensaverTimeout || 3) * 60_000;

  useEffect(() => {
    if (screensaverTimeoutMs <= 0 || loading) return undefined;

    let timeoutId = setTimeout(() => setShowScreensaver(true), screensaverTimeoutMs);

    const reset = () => {
      setShowScreensaver(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => setShowScreensaver(true),
        screensaverTimeoutMs
      );
    };

    const events = ["pointerdown", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [screensaverTimeoutMs, loading]);

  if (loading) {
    if (showSplash) return <Splash company={company} />;
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="animate-pulse text-slate-400 font-medium tracking-widest uppercase">
          Memuat data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary-900 text-white grid place-items-center p-10">
        <div className="text-center max-w-xl">
          <p className="text-7xl">⚠️</p>
          <h1 className="mt-4 text-3xl font-bold">Tidak bisa mengakses data</h1>
          <p className="mt-3 text-primary-100/80">
            {error?.message ||
              "Periksa koneksi internet & Firestore rules. Signage akan otomatis reconnect saat data tersedia."}
          </p>
        </div>
      </div>
    );
  }

  if (view.type === "detail") {
    const vehicle = vehicles.find((v) => v.id === view.vehicleId);
    return (
      <VehicleDetail vehicle={vehicle} company={company} onBack={closeDetail} />
    );
  }

  return (
    <>
      <VehicleList grouped={grouped} company={company} onSelect={openDetail} />
      {showScreensaver && (
        <Screensaver
          grouped={grouped}
          onDismiss={() => setShowScreensaver(false)}
        />
      )}
    </>
  );
}
