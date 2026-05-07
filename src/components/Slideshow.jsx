import { useEffect, useState } from "react";

export default function Slideshow({ images = [], alt = "" }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const safe = images.filter(Boolean);
  const total = safe.length;

  useEffect(() => {
    if (total <= 1 || lightbox) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, 5000);
    return () => clearInterval(id);
  }, [total, lightbox]);

  if (total === 0) {
    return (
      <div className="aspect-[16/9] rounded-2xl bg-slate-100 grid place-items-center text-slate-400">
        Belum ada gambar
      </div>
    );
  }

  const go = (delta) => setIndex((i) => (i + delta + total) % total);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLightbox(true)}
        aria-label="Buka pratinjau gambar"
        className="block w-full aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 shadow-lg cursor-zoom-in relative"
      >
        {safe.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${alt} ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white pointer-events-none">
          🔍 Klik untuk perbesar
        </span>
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Sebelumnya"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow grid place-items-center"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Berikutnya"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow grid place-items-center"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-3 flex gap-2">
            {safe.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {total > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {safe.slice(0, 5).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${
                i === index
                  ? "border-primary-600"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
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
      aria-label="Pratinjau gambar"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
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
            aria-label="Sebelumnya"
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
            aria-label="Berikutnya"
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
