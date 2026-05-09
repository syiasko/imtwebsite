import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import KioskYouTubePlayer, { parseYoutubeUrl } from "./KioskYouTubePlayer";

const SLIDE_INTERVAL_MS = 5000;

export default function VehicleDetail({ vehicle, company, onBack }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Build a unified slide list: images first, then a video slide if the
  // vehicle has a parsable YouTube URL. Each slide carries a `type` tag so
  // the renderer can branch between <img> and <iframe>.
  const slides = useMemo(() => {
    if (!vehicle) return [];
    const out = (vehicle.images || [])
      .filter(Boolean)
      .map((src, i) => ({ type: "image", src, index: i }));
    if (vehicle.youtubeUrl && parseYoutubeUrl(vehicle.youtubeUrl)) {
      out.push({ type: "video", url: vehicle.youtubeUrl });
    }
    return out;
  }, [vehicle]);

  useEffect(() => {
    setActiveSlide(0);
    setLightbox(false);
  }, [vehicle?.id]);

  const active = slides[activeSlide];

  // Auto-cycle, but skip while showing the video slide (the user is
  // presumably watching) and while the lightbox is open.
  useEffect(() => {
    if (slides.length <= 1) return undefined;
    if (active?.type === "video") return undefined;
    if (lightbox) return undefined;
    const id = setInterval(() => {
      setActiveSlide((i) => {
        // Skip past video slide so auto-cycle doesn't dump us into autoplay.
        let next = (i + 1) % slides.length;
        if (slides[next]?.type === "video") {
          next = (next + 1) % slides.length;
        }
        return next;
      });
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides, active, lightbox]);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header company={company} leading={<BackButton onClick={onBack} />} />
        <div className="px-8 lg:px-12 py-24 text-center">
          <p className="text-7xl">🔎</p>
          <h1 className="mt-4 text-3xl font-bold text-primary-900">
            Unit tidak ditemukan
          </h1>
          <p className="mt-3 text-slate-600">
            Unit ini mungkin sudah dihapus oleh admin.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 px-8 py-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold"
          >
            Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  const specEntries = Object.entries(vehicle.specs || {});
  const imageCount = slides.filter((s) => s.type === "image").length;

  const onMainClick = () => {
    if (active?.type === "image") setLightbox(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 anim-fade-in">
      <Header company={company} leading={<BackButton onClick={onBack} />} />

      <main className="px-8 lg:px-12 py-10 grid lg:grid-cols-2 gap-10">
        <section>
          <div
            className={`relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-xl ${
              active?.type === "image" ? "cursor-zoom-in" : ""
            }`}
            onClick={onMainClick}
            role={active?.type === "image" ? "button" : undefined}
            aria-label={
              active?.type === "image" ? "Buka pratinjau gambar" : undefined
            }
          >
            {slides.length === 0 && (
              <div className="w-full h-full grid place-items-center text-white/40 text-7xl">
                🚛
              </div>
            )}
            {slides.map((s, i) =>
              s.type === "image" ? (
                <img
                  key={`img-${i}`}
                  src={s.src}
                  alt={`${vehicle.name} ${i + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    i === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                />
              ) : (
                <div
                  key={`vid-${i}`}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    i === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                  // Don't let clicks on the iframe wrapper bubble up to the
                  // lightbox handler.
                  onClick={(e) => e.stopPropagation()}
                >
                  {i === activeSlide && (
                    <KioskYouTubePlayer
                      url={s.url}
                      title={`Video ${vehicle.name}`}
                    />
                  )}
                </div>
              )
            )}

            {active?.type === "image" && (
              <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-black/65 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white pointer-events-none">
                🔍 Sentuh untuk perbesar
              </span>
            )}

            {slides.length > 1 && active?.type !== "video" && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
                {slides.map((s, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === activeSlide
                        ? s.type === "video"
                          ? "w-8 bg-secondary-400"
                          : "w-8 bg-white"
                        : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {slides.length > 1 && (
            <div
              className={`mt-4 grid gap-3`}
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  6,
                  slides.length
                )}, minmax(0, 1fr))`,
              }}
            >
              {slides.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveSlide(i);
                  }}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-4 transition ${
                    i === activeSlide
                      ? "border-primary-600 shadow-md"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {s.type === "image" ? (
                    <img
                      src={s.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900 grid place-items-center text-white">
                      <div className="text-center">
                        <span className="block text-2xl">▶</span>
                        <span className="block text-[10px] font-bold uppercase tracking-widest mt-0.5">
                          Video
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="anim-scale-in">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-600">
            Detail Spesifikasi
          </p>
          <h1 className="mt-1 text-4xl lg:text-5xl font-extrabold text-primary-900 leading-tight">
            {vehicle.name}
          </h1>
          {vehicle.tagline && (
            <p className="mt-3 text-xl text-slate-600">{vehicle.tagline}</p>
          )}
          {vehicle.description && (
            <p className="mt-6 text-base text-slate-700 leading-relaxed">
              {vehicle.description}
            </p>
          )}

          {vehicle.features?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Fitur Unggulan
              </h2>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                {vehicle.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-base text-slate-700"
                  >
                    <span className="mt-2 inline-block h-2 w-2 rounded-full bg-secondary-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {specEntries.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Spesifikasi Teknis
              </h2>
              <div className="mt-3 rounded-2xl border-2 border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-base">
                  <tbody className="divide-y divide-slate-200">
                    {specEntries.map(([key, value]) => (
                      <tr key={key} className="odd:bg-slate-50">
                        <th className="text-left font-semibold text-slate-700 px-5 py-3 w-1/3 align-top">
                          {key}
                        </th>
                        <td className="px-5 py-3 text-slate-900">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-10 rounded-2xl bg-primary-900 text-white p-6 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm uppercase tracking-widest text-primary-200">
                Tertarik dengan unit ini?
              </p>
              <p className="mt-1 text-lg font-semibold">
                Kunjungi tim sales kami atau hubungi:
              </p>
              <p className="mt-1 text-base">
                {company?.phone}{" "}
                <span className="text-primary-300 mx-2">•</span>{" "}
                {company?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-black font-bold text-lg active:scale-95 transition"
            >
              ← Daftar Produk
            </button>
          </div>
        </section>
      </main>

      <footer className="px-8 lg:px-12 py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        {company?.name} • {company?.address}
      </footer>

      {lightbox && active?.type === "image" && (
        <Lightbox
          slides={slides}
          activeSlide={activeSlide}
          imageCount={imageCount}
          alt={vehicle.name}
          onChangeSlide={setActiveSlide}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

function Lightbox({ slides, activeSlide, alt, onChangeSlide, onClose }) {
  // Restrict navigation to image slides only — the lightbox is for photos.
  const imageSlides = slides
    .map((s, i) => ({ ...s, originalIndex: i }))
    .filter((s) => s.type === "image");
  const currentImageIdx = imageSlides.findIndex(
    (s) => s.originalIndex === activeSlide
  );

  const goImage = (delta) => {
    if (imageSlides.length === 0) return;
    const next =
      (currentImageIdx + delta + imageSlides.length) % imageSlides.length;
    onChangeSlide(imageSlides[next].originalIndex);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goImage(-1);
      else if (e.key === "ArrowRight") goImage(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide, imageSlides.length]);

  const current = slides[activeSlide];
  if (!current || current.type !== "image") return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 grid place-items-center p-6 anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau gambar"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="absolute top-6 right-6 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 text-white text-3xl grid place-items-center active:scale-95"
      >
        ×
      </button>

      {imageSlides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goImage(-1);
            }}
            aria-label="Sebelumnya"
            className="absolute left-6 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white text-4xl grid place-items-center active:scale-95"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goImage(1);
            }}
            aria-label="Berikutnya"
            className="absolute right-6 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white text-4xl grid place-items-center active:scale-95"
          >
            ›
          </button>
        </>
      )}

      <img
        src={current.src}
        alt={`${alt} ${currentImageIdx + 1}`}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {imageSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-base font-semibold">
          {currentImageIdx + 1} / {imageSlides.length}
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 active:scale-95 transition"
    >
      <span className="text-lg">←</span>
      <span className="hidden sm:inline">Kembali</span>
    </button>
  );
}
