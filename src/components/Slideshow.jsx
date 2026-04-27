import { useEffect, useState } from "react";

export default function Slideshow({ images = [], alt = "" }) {
  const [index, setIndex] = useState(0);
  const safe = images.filter(Boolean);
  const total = safe.length;

  useEffect(() => {
    if (total <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, 5000);
    return () => clearInterval(id);
  }, [total]);

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
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
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
      </div>

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

          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
            {safe.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
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
                  ? "border-brand-600"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
