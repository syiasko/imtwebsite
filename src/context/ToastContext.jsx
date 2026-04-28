import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = nextId++;
      const next = {
        id,
        tone: "info",
        duration: 3500,
        ...toast,
      };
      setToasts((prev) => [...prev, next]);
      if (next.duration > 0) {
        setTimeout(() => dismiss(id), next.duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toasts,
      dismiss,
      push,
      success: (message, opts) => push({ ...opts, tone: "success", message }),
      error: (message, opts) => push({ ...opts, tone: "error", message }),
      info: (message, opts) => push({ ...opts, tone: "info", message }),
    }),
    [toasts, dismiss, push]
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
