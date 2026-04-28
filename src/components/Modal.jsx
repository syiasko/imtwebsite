import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-6 pb-2">
            <h3 id="modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h3>
          </div>
        )}
        <div className="px-6 py-4 text-slate-700">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Ya",
  cancelLabel = "Batal",
  tone = "primary",
}) {
  const confirmClass =
    tone === "danger"
      ? "bg-primary-600 hover:bg-primary-700 text-white"
      : "bg-primary-600 hover:bg-primary-700 text-white";
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm">{description}</p>
    </Modal>
  );
}
