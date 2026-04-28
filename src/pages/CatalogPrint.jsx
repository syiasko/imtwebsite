import { useData } from "../context/DataContext";

export default function CatalogPrint() {
  const { categories, vehicles, company } = useData();

  const handlePrint = () => window.print();

  const handleDownloadJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            company,
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
    a.download = `katalog-${(
      company.shortName || "imt"
    ).toLowerCase().replace(/\s+/g, "-")}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const hasPdf = !!company.catalogPdfUrl;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
            Katalog
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
            Download Katalog Produk
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Unduh katalog lengkap berisi seluruh kategori dan unit kendaraan
            yang kami produksi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPdf ? (
            <a
              href={company.catalogPdfUrl}
              download={company.catalogPdfName || "katalog.pdf"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              📄 Download Katalog (PDF)
            </a>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              ⬇ Cetak / Simpan PDF
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Download JSON
          </button>
        </div>
      </div>

      {hasPdf && (
        <div className="mt-8 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm print:hidden">
          <iframe
            src={company.catalogPdfUrl}
            title="Pratinjau Katalog"
            className="w-full h-[80vh]"
          />
        </div>
      )}

      <div className="mt-10 print:mt-0" id="printable-catalog">
        <div className="text-center mb-10 hidden print:block">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-sm">{company.tagline}</p>
          <p className="text-xs mt-1">
            {company.address} • {company.whatsapp || company.phone} •{" "}
            {company.email}
          </p>
          <hr className="mt-4" />
        </div>

        {!hasPdf &&
          categories.map((cat) => {
            const items = vehicles.filter((v) => v.categoryId === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} className="mb-12 print:break-inside-avoid">
                <div className="flex items-baseline justify-between border-b-2 border-primary-600 pb-2 mb-5">
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
          Dokumen ini digenerate otomatis dari katalog {company.name} pada{" "}
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
