import { useEffect, useState } from "react";
import Header from "./Header";

const SLIDE_INTERVAL_MS = 5000;

export default function VehicleDetail({ vehicle, company, onBack }) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [vehicle?.id]);

  const images = vehicle?.images?.filter(Boolean) || [];

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const id = setInterval(() => {
      setActiveImage((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header
          company={company}
          leading={<BackButton onClick={onBack} />}
        />
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

  return (
    <div className="min-h-screen bg-slate-50 anim-fade-in">
      <Header company={company} leading={<BackButton onClick={onBack} />} />

      <main className="px-8 lg:px-12 py-10 grid lg:grid-cols-2 gap-10">
        <section>
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 shadow-xl">
            {images.length > 0 ? (
              images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${vehicle.name} ${i + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    i === activeImage ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
            ) : (
              <div className="w-full h-full grid place-items-center text-white/40 text-7xl">
                🚛
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === activeImage ? "w-8 bg-white" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {images.slice(0, 5).map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-4 transition ${
                    i === activeImage
                      ? "border-primary-600 shadow-md"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
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
