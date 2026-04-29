import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  DEFAULT_ADMIN_PASSWORD,
  sha256Hex,
  verifyAdminPassword,
} from "../firebase/password";

const SESSION_KEY = "imt-admin-session-v3";
const SESSION_USER_KEY = "imt-admin-user-id";
const SESSION_USERNAME_KEY = "imt-admin-username";
const SESSION_ROLE_KEY = "imt-admin-user-role";
export const ADMIN_BASE_PATH = "/dapurnyaimt";

export const getCurrentAdminRole = () => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ROLE_KEY);
};

export const isCurrentAdmin = () => getCurrentAdminRole() === "admin";

export default function Admin() {
  const [authed, setAuthed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const {
    categories,
    vehicles,
    users,
    company,
    loading,
    authStatus,
    authError,
    firestoreError,
  } = useData();
  const { pathname } = useLocation();

  const hasUsers = users.length > 0;

  const onLogin = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const username = (fd.get("username") || "").toString().trim().toLowerCase();
      const pwd = (fd.get("password") || "").toString();

      if (hasUsers) {
        const user = users.find((u) => u.username?.toLowerCase() === username);
        if (!user) {
          setError("Username tidak ditemukan.");
          return;
        }
        const inputHash = await sha256Hex(pwd);
        if (inputHash !== user.passwordHash) {
          setError("Password salah.");
          return;
        }
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.setItem(SESSION_USER_KEY, user.id);
        sessionStorage.setItem(SESSION_USERNAME_KEY, user.username);
        sessionStorage.setItem(SESSION_ROLE_KEY, user.role || "admin");
        setAuthed(true);
      } else {
        // Legacy single-password mode (no users yet) — treated as admin.
        const ok = await verifyAdminPassword(pwd, company.passwordHash);
        if (!ok) {
          setError("Password salah.");
          return;
        }
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.setItem(SESSION_USER_KEY, "legacy-admin");
        sessionStorage.setItem(SESSION_USERNAME_KEY, "admin");
        sessionStorage.setItem(SESSION_ROLE_KEY, "admin");
        setAuthed(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const onLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_USERNAME_KEY);
    sessionStorage.removeItem(SESSION_ROLE_KEY);
    setAuthed(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-slate-500">
        Memuat data...
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="container mx-auto px-4 py-20 max-w-xl">
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6 text-primary-900">
          <h1 className="text-lg font-bold">Firebase belum siap</h1>
          <p className="mt-2 text-sm">
            {authError?.message ||
              "Tidak bisa terkoneksi ke Firebase Auth. Pastikan Anonymous sign-in aktif di Firebase Console."}
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masuk untuk mengelola kategori, kendaraan, pengguna, dan pengaturan
            website.
          </p>
          <form onSubmit={onLogin} className="mt-6 space-y-4">
            {hasUsers && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  autoFocus
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoFocus={!hasUsers}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              />
              {!hasUsers && !company.passwordHash && (
                <p className="mt-1 text-xs text-slate-500">
                  Password default:{" "}
                  <code className="font-mono">{DEFAULT_ADMIN_PASSWORD}</code>{" "}
                  — segera buat user via tab Pengguna setelah login.
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

  const isOverview =
    pathname === ADMIN_BASE_PATH || pathname === `${ADMIN_BASE_PATH}/`;
  const currentUsername = sessionStorage.getItem(SESSION_USERNAME_KEY);
  const currentRole = sessionStorage.getItem(SESSION_ROLE_KEY) || "admin";
  const isAdmin = currentRole === "admin";

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
            Login sebagai{" "}
            <span className="font-mono font-semibold text-slate-900">
              {currentUsername || "admin"}
            </span>{" "}
            <span
              className={`inline-block ml-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                isAdmin
                  ? "bg-primary-50 text-primary-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {currentRole}
            </span>
            . Data tersimpan di Firestore.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </div>

      {firestoreError && (
        <div className="mt-4 rounded-lg border border-secondary-300 bg-secondary-50 px-4 py-3 text-sm text-secondary-900">
          ⚠ Firestore: {firestoreError.message || "Subscription error"}.
          Periksa Firestore rules di Firebase Console.
        </div>
      )}

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
        {isAdmin && (
          <NavLink to={`${ADMIN_BASE_PATH}/pengguna`} className={tabClass}>
            Pengguna ({users.length})
          </NavLink>
        )}
        <NavLink to={`${ADMIN_BASE_PATH}/pengaturan`} className={tabClass}>
          Company Setting
        </NavLink>
      </div>

      <div className="mt-8">{isOverview ? <Overview /> : <Outlet />}</div>
    </div>
  );
}

function Overview() {
  const { categories, vehicles, users } = useData();
  const isAdmin = isCurrentAdmin();
  return (
    <div className={`grid gap-6 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
      <StatCard label="Total Kategori" value={categories.length} />
      <StatCard label="Total Kendaraan" value={vehicles.length} />
      {isAdmin && (
        <StatCard label="Total Pengguna" value={users.length} />
      )}
      <StatCard
        label="Rata-rata Unit / Kategori"
        value={
          categories.length === 0
            ? 0
            : (vehicles.length / categories.length).toFixed(1)
        }
      />
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${isAdmin ? "md:col-span-4" : "md:col-span-3"}`}>
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
