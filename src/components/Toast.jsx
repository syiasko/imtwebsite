import { useToast } from "../context/ToastContext";

const TONE_CLASSES = {
  success: "bg-emerald-700 text-white border-emerald-800",
  error: "bg-red-700 text-white border-red-800",
  info: "bg-slate-900 text-white border-slate-800",
};

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 animate-[toast-in_.2s_ease-out] ${
            TONE_CLASSES[t.tone] || TONE_CLASSES.info
          }`}
        >
          <div className="flex-1 text-sm">
            {t.title && <p className="font-semibold">{t.title}</p>}
            {t.message && <p className={t.title ? "opacity-90 mt-0.5" : ""}>{t.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Tutup notifikasi"
            className="text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
