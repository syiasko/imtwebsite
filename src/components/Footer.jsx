import { Link } from "react-router-dom";
import { companyInfo } from "../data/initialData";
import { useData } from "../context/DataContext";

export default function Footer() {
  const { categories } = useData();
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white font-bold">
              IMT
            </span>
            <p className="font-bold text-white">{companyInfo.name}</p>
          </div>
          <p className="text-sm leading-relaxed">{companyInfo.tagline}</p>
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
            <li>
              <Link to="/admin" className="hover:text-white">
                Admin Panel
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Hubungi Kami</p>
          <ul className="space-y-2 text-sm">
            <li>{companyInfo.address}</li>
            <li>Telp: {companyInfo.phone}</li>
            <li>Email: {companyInfo.email}</li>
            <li>{companyInfo.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-4 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
          <p>
            &copy; {new Date().getFullYear()} {companyInfo.name}. All rights
            reserved.
          </p>
          <p>Built for showcase purpose.</p>
        </div>
      </div>
    </footer>
  );
}
