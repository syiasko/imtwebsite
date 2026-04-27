import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  DEFAULT_ADMIN_PASSWORD,
  verifyAdminPassword,
} from "../firebase/password";

const SESSION_KEY = "imt-admin-session-v2";
export const ADMIN_BASE_PATH = "/dapurnyaimt";

export default function Admin() {
  const [authed, setAuthed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { categories, vehicles, company, loading, resetData } = useData();
  const { pathname } = useLocation();

  const onLogin = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const pwd = new FormData(e.currentTarget).get("password");
      const ok = await verifyAdminPassword(pwd, company.passwordHash);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setAuthed(true);
      } else {
        setError("Password salah.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const onLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  const onReset = () => {
    if (
      window.confirm(
        "Reset data ke kondisi awal? Kategori, kendaraan, dan pengaturan default akan ditulis ulang."
      )
    ) {
      resetData();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-slate-500">
        Memuat data...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masuk untuk mengelola kategori, kendaraan, dan pengaturan website.
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              />
              {!company.passwordHash && (
                <p className="mt-1 text-xs text-slate-500">
                  Password default:{" "}
                  <code className="font-mono">{DEFAULT_ADMIN_PASSWORD}</code>{" "}
                  — segera ganti setelah login.
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-primary-700 bg-primary-50 px-3 py-2 rounded">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={verifying}
              className="w-full px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
            >
              {verifying ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-slate-500 hover:text-primary-700"
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
        ? "bg-primary-600 text-white"
        : "bg-white text-slate-700 border border-slate-200 hover:border-primary-300"
    }`;

  const isOverview = pathname === ADMIN_BASE_PATH || pathname === `${ADMIN_BASE_PATH}/`;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Panel Pengelolaan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola kategori, kendaraan, dan pengaturan website.
            Data tersimpan di Firestore.
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
        <NavLink to={ADMIN_BASE_PATH} end className={tabClass}>
          Ringkasan
        </NavLink>
        <NavLink to={`${ADMIN_BASE_PATH}/kategori`} className={tabClass}>
          Kategori ({categories.length})
        </NavLink>
        <NavLink to={`${ADMIN_BASE_PATH}/kendaraan`} className={tabClass}>
          Kendaraan ({vehicles.length})
        </NavLink>
        <NavLink to={`${ADMIN_BASE_PATH}/pengaturan`} className={tabClass}>
          Company Setting
        </NavLink>
      </div>

      <div className="mt-8">{isOverview ? <Overview /> : <Outlet />}</div>
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
            const pct = vehicles.length ? (count / vehicles.length) * 100 : 0;
            return (
              <li key={c.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{c.name}</span>
                  <span className="text-slate-500">{count} unit</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600"
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
