import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import VehicleCard from "../components/VehicleCard";
import { companyInfo } from "../data/initialData";

export default function Home() {
  const { categories, vehicles } = useData();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const featured = vehicles.slice(0, 6);

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #dc2626 0%, transparent 50%), radial-gradient(circle at 80% 80%, #1d4ed8 0%, transparent 50%)",
          }}
        />
        <div className="relative container mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block bg-brand-600/20 text-brand-100 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
              Karoseri Custom Built
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
              Kendaraan Khusus, Dibangun Presisi untuk Misi Anda.
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">
              Dari ambulance standar Kemenkes, mobil pemadam, rantis taktis,
              hingga food truck dan SNG broadcasting van — {companyInfo.name}{" "}
              merancang & memproduksi sesuai kebutuhan operasional Anda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/produk"
                className="inline-flex items-center px-5 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
              >
                Lihat Semua Produk
              </Link>
              <Link
                to="/katalog"
                className="inline-flex items-center px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20"
              >
                Download Katalog
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat value={`${vehicles.length}+`} label="Unit dirancang" />
              <Stat value={`${categories.length}`} label="Kategori produk" />
              <Stat value="20+" label="Tahun pengalaman" />
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((v, i) => (
                <div
                  key={v.id}
                  className={`rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${
                    i % 2 === 0 ? "translate-y-4" : ""
                  }`}
                >
                  <img
                    src={v.images?.[0]}
                    alt={v.name}
                    className="w-full h-44 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <SectionHeader
          eyebrow="Kategori"
          title="Lini Produk Karoseri"
          subtitle="Setiap unit dapat dikustomisasi sesuai standar operasional dan branding klien."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/produk/kategori/${c.slug}`}
              className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-brand-300 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">
                  {c.name}
                </h3>
                <span className="text-brand-600 text-xl">→</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {vehicles.filter((v) => v.categoryId === c.id).length} unit
                tersedia
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Showcase"
            title="Unit Unggulan"
            subtitle="Beberapa unit yang sering kami produksi. Klik untuk melihat spesifikasi lengkap."
            cta={
              <Link
                to="/produk"
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Semua produk →
              </Link>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {featured.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                categoryName={categoryById[v.categoryId]?.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 to-brand-900 text-white p-10 md:p-14 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl md:text-3xl font-bold">
              Butuh konfigurasi khusus?
            </h3>
            <p className="mt-3 text-brand-50/90">
              Tim engineering kami siap mendampingi dari konsep, desain CAD,
              prototyping, hingga uji homologasi. Sampaikan kebutuhan Anda dan
              kami akan menyiapkan proposal teknis & komersial.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Link
              to="/kontak"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-white text-brand-700 font-semibold hover:bg-brand-50"
            >
              Konsultasi Sekarang
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, cta }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-slate-600 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {cta}
    </div>
  );
}
