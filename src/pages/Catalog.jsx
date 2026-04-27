import { useData } from "../context/DataContext";
import { companyInfo } from "../data/initialData";

export default function Catalog() {
  const { categories, vehicles } = useData();

  const handlePrint = () => window.print();

  const handleDownloadJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            company: companyInfo,
            categories,
            vehicles: vehicles.map((v) => ({ ...v, images: [] })),
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katalog-imt-karoseri-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Katalog
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
            Download Katalog Produk
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Unduh katalog lengkap berisi seluruh kategori dan unit kendaraan
            yang kami produksi. Tersedia dalam format PDF (cetak) dan JSON.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
          >
            ⬇ Download PDF (Cetak)
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="mt-10 print:mt-0" id="printable-catalog">
        <div className="text-center mb-10 hidden print:block">
          <h1 className="text-3xl font-bold">{companyInfo.name}</h1>
          <p className="text-sm">{companyInfo.tagline}</p>
          <p className="text-xs mt-1">
            {companyInfo.address} • {companyInfo.phone} • {companyInfo.email}
          </p>
          <hr className="mt-4" />
        </div>

        {categories.map((cat) => {
          const items = vehicles.filter((v) => v.categoryId === cat.id);
          if (items.length === 0) return null;
          return (
            <section
              key={cat.id}
              className="mb-12 print:break-inside-avoid"
            >
              <div className="flex items-baseline justify-between border-b-2 border-brand-600 pb-2 mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  {cat.name}
                </h2>
                <span className="text-sm text-slate-500">
                  {items.length} unit
                </span>
              </div>
              {cat.description && (
                <p className="text-slate-600 mb-5">{cat.description}</p>
              )}

              <div className="grid gap-6 md:grid-cols-2 print:grid-cols-1">
                {items.map((v) => (
                  <article
                    key={v.id}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-white print:break-inside-avoid"
                  >
                    {v.images?.[0] && (
                      <img
                        src={v.images[0]}
                        alt={v.name}
                        className="w-full h-44 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-slate-900">
                        {v.name}
                      </h3>
                      {v.tagline && (
                        <p className="text-sm text-slate-600 mt-1">
                          {v.tagline}
                        </p>
                      )}
                      {Object.keys(v.specs || {}).length > 0 && (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {Object.entries(v.specs)
                            .slice(0, 6)
                            .map(([k, val]) => (
                              <div key={k}>
                                <dt className="text-slate-500">{k}</dt>
                                <dd className="text-slate-800 font-medium">
                                  {val}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      )}
                      {v.features?.length > 0 && (
                        <ul className="mt-3 text-xs text-slate-700 list-disc list-inside space-y-0.5">
                          {v.features.slice(0, 4).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <div className="hidden print:block text-center text-xs text-slate-500 mt-10">
          Dokumen ini digenerate otomatis dari katalog{" "}
          {companyInfo.name} pada{" "}
          {new Date().toLocaleDateString("id-ID", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          .
        </div>
      </div>
    </div>
  );
}
