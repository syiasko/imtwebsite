import { Link, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import Slideshow from "../components/Slideshow";
import SpecTable from "../components/SpecTable";
import { trackEvent } from "../firebase/config";

export default function VehicleDetail() {
  const { id } = useParams();
  const { vehicles, categories, company } = useData();
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Unit tidak ditemukan
        </h1>
        <p className="mt-2 text-slate-600">
          Unit yang Anda cari mungkin sudah dihapus atau tidak tersedia.
        </p>
        <Link
          to="/produk"
          className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-brand-600 text-white font-semibold"
        >
          Kembali ke Produk
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === vehicle.categoryId);
  const related = vehicles
    .filter((v) => v.categoryId === vehicle.categoryId && v.id !== vehicle.id)
    .slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-10">
      <nav className="text-sm text-slate-500 mb-6 flex flex-wrap items-center gap-1">
        <Link to="/" className="hover:text-brand-700">
          Beranda
        </Link>
        <span>/</span>
        <Link to="/produk" className="hover:text-brand-700">
          Produk
        </Link>
        {category && (
          <>
            <span>/</span>
            <Link
              to={`/produk/kategori/${category.slug}`}
              className="hover:text-brand-700"
            >
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-700 font-medium">{vehicle.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        <Slideshow images={vehicle.images} alt={vehicle.name} />

        <div>
          {category && (
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-1 rounded">
              {category.name}
            </span>
          )}
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">
            {vehicle.name}
          </h1>
          {vehicle.tagline && (
            <p className="mt-2 text-lg text-slate-600">{vehicle.tagline}</p>
          )}

          <p className="mt-6 text-slate-700 leading-relaxed">
            {vehicle.description}
          </p>

          {vehicle.features?.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Fitur Unggulan
              </h2>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {vehicle.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              onClick={() =>
                trackEvent("whatsapp_click", {
                  source: "vehicle_detail",
                  vehicle_id: vehicle.id,
                })
              }
              href={`https://wa.me/${(company.whatsapp || company.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                `Halo ${company.shortName || company.name}, saya tertarik dengan unit "${vehicle.name}". Mohon informasinya.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
            >
              💬 Konsultasi via WhatsApp
            </a>
            <Link
              to="/katalog"
              className="inline-flex items-center px-5 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Download Katalog
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-slate-900">
          Spesifikasi Teknis
        </h2>
        <p className="text-slate-600 mt-1">
          Spesifikasi dapat berubah sewaktu-waktu sesuai konfigurasi pesanan.
        </p>
        <div className="mt-5">
          <SpecTable specs={vehicle.specs} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900">
            Unit lainnya di kategori ini
          </h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((v) => (
              <Link
                key={v.id}
                to={`/produk/${v.id}`}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-md transition"
              >
                <img
                  src={v.images?.[0]}
                  alt={v.name}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{v.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {v.tagline}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
