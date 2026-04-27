import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";

const ADMIN_PASS = "imt-admin";
const SESSION_KEY = "imt-admin-session";

export default function Admin() {
  const [authed, setAuthed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [error, setError] = useState("");
  const { categories, vehicles, resetData } = useData();
  const { pathname } = useLocation();

  const onLogin = (e) => {
    e.preventDefault();
    const pwd = new FormData(e.currentTarget).get("password");
    if (pwd === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError("Password salah. Coba: imt-admin");
    }
  };

  const onLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  const onReset = () => {
    if (
      window.confirm(
        "Reset data ke kondisi awal? Semua perubahan & unit yang Anda tambahkan akan hilang."
      )
    ) {
      resetData();
    }
  };

  if (!authed) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masuk untuk mengelola kategori dan kendaraan.
          </p>
          <form onSubmit={onLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Demo password: <code className="font-mono">imt-admin</code>
              </p>
            </div>
            {error && (
              <p className="text-sm text-brand-700 bg-brand-50 px-3 py-2 rounded">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
            >
              Masuk
            </button>
          </form>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-slate-500 hover:text-brand-700"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const tabClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium ${
      isActive
        ? "bg-brand-600 text-white"
        : "bg-white text-slate-700 border border-slate-200 hover:border-brand-300"
    }`;

  const isOverview = pathname === "/admin" || pathname === "/admin/";

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Panel Pengelolaan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola kategori, tambah/ubah unit kendaraan. Data tersimpan di
            browser ini (localStorage).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Reset Data
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <NavLink to="/admin" end className={tabClass}>
          Ringkasan
        </NavLink>
        <NavLink to="/admin/kategori" className={tabClass}>
          Kategori ({categories.length})
        </NavLink>
        <NavLink to="/admin/kendaraan" className={tabClass}>
          Kendaraan ({vehicles.length})
        </NavLink>
      </div>

      <div className="mt-8">
        {isOverview ? <Overview /> : <Outlet />}
      </div>
    </div>
  );
}

function Overview() {
  const { categories, vehicles } = useData();
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard label="Total Kategori" value={categories.length} />
      <StatCard label="Total Kendaraan" value={vehicles.length} />
      <StatCard
        label="Rata-rata Unit / Kategori"
        value={
          categories.length === 0
            ? 0
            : (vehicles.length / categories.length).toFixed(1)
        }
      />
      <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Sebaran per Kategori</h2>
        <ul className="mt-4 space-y-3">
          {categories.map((c) => {
            const count = vehicles.filter((v) => v.categoryId === c.id).length;
            const pct = vehicles.length
              ? (count / vehicles.length) * 100
              : 0;
            return (
              <li key={c.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <span className="text-slate-500">{count} unit</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
