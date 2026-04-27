import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";

export default function Footer() {
  const { categories, company } = useData();
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary-600 text-white font-bold">
              IMT
            </span>
            <p className="font-bold text-white">
              {company.shortName || "IMT Karoseri"}
            </p>
          </div>
          <p className="text-sm font-semibold text-white">{company.name}</p>
          <p className="mt-2 text-sm leading-relaxed">{company.tagline}</p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Produk</p>
          <ul className="space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  to={`/produk/kategori/${c.slug}`}
                  className="hover:text-white"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Perusahaan</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-white">
                Tentang Kami
              </Link>
            </li>
            <li>
              <Link to="/katalog" className="hover:text-white">
                Download Katalog
              </Link>
            </li>
            <li>
              <Link to="/kontak" className="hover:text-white">
                Kontak
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Hubungi Kami</p>
          <ul className="space-y-2 text-sm">
            {company.address?.split(",").map((line, i) => (
              <li key={i}>{line.trim()}</li>
            ))}
            <li>Telp / WA: {company.whatsapp || company.phone}</li>
            <li>Email: {company.email}</li>
            <li>{company.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-4 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
          <p>
            &copy; {new Date().getFullYear()} {company.name}. All rights
            reserved.
          </p>
          <p>Powered by Firebase &amp; Vercel.</p>
        </div>
      </div>
    </footer>
  );
}
