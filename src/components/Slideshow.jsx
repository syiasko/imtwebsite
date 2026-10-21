import { useEffect, useState } from "react";
import { useT } from "../context/LanguageContext";
import { smallUrl } from "../lib/media";
import { MEDIA_BASE_URL } from "../lib/supabase";

// No autoplay: visitors compare photos at their own pace (WCAG 2.2.2).
export default function Slideshow({ images = [], alt = "" }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  // Full-size photos load when first shown (plus the next one), not all at once.
  const [seen, setSeen] = useState(() => new Set([0, 1]));
  const safe = images.filter(Boolean);
  const total = safe.length;

  useEffect(() => {
    setSeen((prev) =>
      prev.has(index) && prev.has((index + 1) % (total || 1))
        ? prev
        : new Set([...prev, index, (index + 1) % (total || 1)])
    );
  }, [index, total]);

  if (total === 0) {
    return (
      <div className="aspect-[16/9] rounded-2xl bg-slate-100 grid place-items-center text-slate-600">
        {t("slideshow.noImage")}
      </div>
    );
  }

  const go = (delta) => setIndex((i) => (i + delta + total) % total);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLightbox(true)}
        aria-label={t("slideshow.open")}
        className="block w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 cursor-zoom-in relative"
      >
        {safe.map((src, i) => (
          <img
            key={i}
            src={seen.has(i) ? src : undefined}
            alt={`${alt} ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-2.5 py-1 text-xs font-medium text-white pointer-events-none">
          {t("slideshow.zoomHint")}
        </span>
        {total > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-2.5 py-1 text-xs font-medium text-white pointer-events-none">
            {index + 1} / {total}
          </span>
        )}
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("common.prev")}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 hover:bg-white text-slate-900 text-2xl shadow grid place-items-center"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("common.next")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 hover:bg-white text-slate-900 text-2xl shadow grid place-items-center"
          >
            ›
          </button>
        </>
      )}

      {total > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {safe.slice(0, 5).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("slideshow.thumb", { index: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${
                i === index
                  ? "border-primary-600"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={smallUrl(MEDIA_BASE_URL, src)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          images={safe}
          index={index}
          setIndex={setIndex}
          alt={alt}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, setIndex, alt, onClose }) {
  const { t } = useT();
  const total = images.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + total) % total);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [setIndex, total, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 grid place-items-center p-4 animate-[toast-in_.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={t("slideshow.preview")}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("slideshow.close")}
        autoFocus
        className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl grid place-items-center"
      >
        ×
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + total) % total);
            }}
            aria-label={t("common.prev")}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-3xl grid place-items-center"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % total);
            }}
            aria-label={t("common.next")}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-3xl grid place-items-center"
          >
            ›
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt={`${alt} ${index + 1}`}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {total > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium">
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}
