import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { companyInfo } from "../data/initialData";

const links = [
  { to: "/", label: "Beranda", end: true },
  { to: "/produk", label: "Produk" },
  { to: "/katalog", label: "Katalog" },
  { to: "/kontak", label: "Kontak" },
  { to: "/admin", label: "Admin" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive
        ? "bg-brand-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 text-white font-bold">
            IMT
          </span>
          <div className="leading-tight">
            <p className="font-bold text-slate-900">{companyInfo.name}</p>
            <p className="text-[11px] text-slate-500 -mt-0.5">
              Karoseri Custom Indonesia
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-300"
          aria-label="Buka menu"
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
          <div className="container mx-auto px-4 py-2 flex flex-col">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `py-2 px-2 rounded-md text-sm font-medium ${
                    isActive
                      ? "text-brand-700 bg-brand-50"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
