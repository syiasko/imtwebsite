import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import CatalogDownloadButton from "./CatalogDownloadButton";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { company } = useData();
  const { t } = useT();

  const links = [
    { to: "/", label: t("nav.home"), end: true },
    { to: "/produk", label: t("nav.products") },
    { to: "/kontak", label: t("nav.contact") },
  ];

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/produk?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive
        ? "bg-primary-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="container mx-auto px-4 flex items-center gap-4 h-16">
        <Link
          to="/"
          className="flex items-center gap-2 flex-shrink-0"
          onClick={() => setOpen(false)}
        >
          <img
            src="/logo.png"
            alt="IMT Karoseri"
            className="h-10 w-10 rounded-md object-contain bg-white"
          />
          <div className="leading-tight hidden sm:block">
            <p className="font-bold text-slate-900">
              {company.shortName || "IMT Karoseri"}
            </p>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              Karoseri Custom Indonesia
            </p>
          </div>
        </Link>

        <form
          onSubmit={onSearchSubmit}
          role="search"
          className="hidden md:flex flex-1 max-w-md mx-2"
        >
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("nav.searchPlaceholder")}
              aria-label={t("nav.searchAria")}
              className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <CatalogDownloadButton className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100">
            {t("nav.catalog")}
          </CatalogDownloadButton>
        </nav>

        <div className="hidden md:block">
          <LanguageToggle />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden ml-auto inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-300"
          aria-label={t("nav.menu")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            <form onSubmit={onSearchSubmit} role="search">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("nav.searchPlaceholder")}
                  aria-label={t("nav.searchAria")}
                  className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                />
              </div>
            </form>
            <div className="flex flex-col">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `py-2 px-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "text-primary-700 bg-primary-50"
                        : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="py-2">
                <CatalogDownloadButton className="text-sm font-medium text-primary-700 hover:underline">
                  {t("nav.catalog")}
                </CatalogDownloadButton>
              </div>
            </div>
            <div>
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
