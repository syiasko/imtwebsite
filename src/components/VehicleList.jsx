import { useEffect, useState } from "react";
import Header from "./Header";
import { QRCodeCanvas } from "qrcode.react";

export default function VehicleList({ grouped, company, onSelect }) {
  const [activeCat, setActiveCat] = useState("all");

  const visibleGroups =
    activeCat === "all"
      ? grouped
      : grouped.filter((g) => g.category.id === activeCat);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const totalUnits = grouped.reduce((acc, g) => acc + g.items.length, 0);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 anim-fade-in">
      <Header company={company} />

      <section className="px-8 lg:px-12 pt-10 pb-6 flex flex-col md:flex-row justify-between gap-8 items-start">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-600">
            Showcase
          </p>
          <h1 className="mt-1 text-4xl lg:text-5xl font-extrabold text-primary-900">
            Lini Produk Karoseri
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            {totalUnits} unit kendaraan khusus dalam {grouped.length} kategori.
            Sentuh kartu untuk melihat spesifikasi lengkap.
          </p>
        </div>

        {company?.websiteUrl && (
          <div className="flex items-center gap-6 p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-sm anim-scale-in">
            <div className="shrink-0 p-2 bg-white rounded-xl shadow-inner border border-slate-100">
              <QRCodeCanvas value={company.websiteUrl} size={110} level="H" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Scan QR Code
              </p>
              <p className="text-xl font-extrabold text-primary-900 leading-tight mt-1">
                Kunjungi Website
              </p>
              <p className="text-sm text-slate-500 mt-1 truncate max-w-[150px]">
                {company.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
              </p>
            </div>
          </div>
        )}
      </section>

      {grouped.length > 1 && (
        <section className="sticky top-0 z-30 px-8 lg:px-12 py-4 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all duration-300">
          <div className="overflow-x-auto no-scrollbar -mx-8 lg:-mx-12 px-8 lg:px-12">
            <div className="flex flex-nowrap gap-3 w-max">
              <CategoryPill
                label="Semua"
                count={totalUnits}
                active={activeCat === "all"}
                onClick={() => setActiveCat("all")}
              />
              {grouped.map(({ category, items }) => (
                <CategoryPill
                  key={category.id}
                  label={category.name}
                  count={items.length}
                  active={activeCat === category.id}
                  onClick={() => setActiveCat(category.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="px-8 lg:px-12 pt-12 pb-12 space-y-12">
        {visibleGroups.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-16 text-center">
            <p className="text-3xl">🚛</p>
            <p className="mt-3 text-lg text-slate-500">
              Belum ada unit untuk kategori ini.
            </p>
          </div>
        )}

        {visibleGroups.map(({ category, items }) => (
          <section key={category.id} className="anim-fade-in">
            <div className="flex items-baseline justify-between mb-5 border-b-4 border-secondary-500 pb-3">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-primary-900">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-2 text-slate-600 max-w-2xl">
                    {category.description}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {items.length} unit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((v) => (
                <VehicleTile
                  key={v.id}
                  vehicle={v}
                  onClick={() => onSelect(v.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="px-8 lg:px-12 py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        {company?.name} • {company?.address}
      </footer>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-10 right-10 z-[60] h-16 w-16 rounded-full bg-primary-600 text-white text-3xl shadow-2xl shadow-primary-900/40 grid place-items-center active:scale-90 transition-all anim-scale-in border-4 border-white"
          aria-label="Kembali ke atas"
        >
          ↑
        </button>
      )}
    </div>
  );
}

function CategoryPill({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-semibold border-2 transition active:scale-95 ${
        active
          ? "bg-primary-600 border-primary-600 text-white shadow-md"
          : "bg-white border-slate-200 text-slate-700 hover:border-primary-300"
      }`}
    >
      {label}{" "}
      <span className={active ? "text-secondary-300" : "text-slate-400"}>
        ({count})
      </span>
    </button>
  );
}

function VehicleTile({ vehicle, onClick }) {
  const cover = vehicle.images?.[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 hover:border-primary-300 transition text-left active:scale-[0.98]"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {cover ? (
          <img
            src={cover}
            alt={vehicle.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-400 text-5xl">
            🚛
          </div>
        )}
        {vehicle.images?.length > 1 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white">
            📷 {vehicle.images.length}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-700">
          {vehicle.name}
        </h3>
        {vehicle.tagline && (
          <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
            {vehicle.tagline}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {vehicle.features?.length || 0} fitur unggulan
          </span>
          <span className="font-bold text-primary-700 group-hover:translate-x-1 transition">
            Lihat detail →
          </span>
        </div>
      </div>
    </button>
  );
}
