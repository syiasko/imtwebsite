import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";

// Loading / error placeholder for public pages that render Firestore data.
// Returns null once data is ready so callers can fall through to content:
//   const loadState = useLoadState();
//   return loadState || <Content />;
export function useLoadState() {
  const { loading, firestoreError, authStatus } = useData();
  const { t } = useT();

  if (firestoreError || authStatus === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800"
      >
        <p>{t("common.loadError")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold"
        >
          {t("common.reload")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <p role="status" className="py-12 text-center text-slate-600">
        {t("common.loading")}
      </p>
    );
  }

  return null;
}
