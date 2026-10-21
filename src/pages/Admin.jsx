import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import { authErrorMessage, useAuth } from "../context/AuthContext";

export const ADMIN_BASE_PATH = "/dapurnyaimt";

export const useIsAdmin = () => useAuth().isAdmin;

export default function Admin() {
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { status, username, role, isAdmin, signIn, signOut } = useAuth();
  const {
    categories,
    vehicles,
    users,
    messages,
    loading,
    loadError,
  } = useData();
  const unreadMessages = messages.filter(
    (m) => (m.status || "New") === "New"
  ).length;
  const { pathname } = useLocation();

  const onLogin = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const name = (fd.get("username") || "").toString().trim().toLowerCase();
      const pwd = (fd.get("password") || "").toString();
      if (!/^[a-z0-9._-]+$/.test(name)) {
        setError("Username atau password salah.");
        return;
      }
      await signIn(name, pwd);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <p role="status" className="container mx-auto px-4 py-20 text-center text-slate-600">
        Memuat data...
      </p>
    );
  }

  if (status === "noAccess") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div role="alert" className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-900">Akun tidak punya akses</h1>
          <p className="mt-2 text-sm text-slate-600">
            Akun ini sudah tidak terdaftar sebagai pengguna panel. Hubungi
            admin untuk mengaktifkannya lagi.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (status !== "signedIn") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Masuk untuk mengelola kategori, kendaraan, pengguna, dan pengaturan
            website.
          </p>
          <form onSubmit={onLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                name="username"
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded">
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
            className="mt-4 inline-block text-sm text-slate-600 hover:text-primary-700"
          >
            Kembali ke beranda
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

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Panel Pengelolaan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Login sebagai{" "}
            <span className="font-mono font-semibold text-slate-900">
              {username}
            </span>{" "}
            <span
              className={`inline-block ml-1 text-xs font-semibold px-2 py-0.5 rounded ${
                isAdmin
                  ? "bg-primary-50 text-primary-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {role}
            </span>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <NavLink
            to={`${ADMIN_BASE_PATH}/akun`}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Ganti password
          </NavLink>
          <button
            onClick={signOut}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Data gagal dimuat: {loadError.message || "kesalahan tidak diketahui"}.
          Muat ulang halaman; kalau masih gagal, cek status Supabase.
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
        <NavLink to={`${ADMIN_BASE_PATH}/pesan`} className={tabClass}>
          <span className="inline-flex items-center gap-1.5">
            Pesan Kontak ({messages.length})
            {unreadMessages > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-slate-900 bg-secondary-500 rounded-full"
                aria-label={`${unreadMessages} belum dibaca`}
              >
                {unreadMessages}
              </span>
            )}
          </span>
        </NavLink>
        {isAdmin && (
          <NavLink to={`${ADMIN_BASE_PATH}/pengguna`} className={tabClass}>
            Pengguna ({users.length})
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to={`${ADMIN_BASE_PATH}/greeting`} className={tabClass}>
            Greeting
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to={`${ADMIN_BASE_PATH}/pengaturan`} className={tabClass}>
            Company Setting
          </NavLink>
        )}
        <NavLink to={`${ADMIN_BASE_PATH}/akses-ai`} className={tabClass}>
          Akses AI
        </NavLink>
      </div>

      <div className="mt-8">{isOverview ? <Overview /> : <Outlet />}</div>
    </div>
  );
}

// Overview leads with what needs action (unanswered messages); totals already
// sit in the tab labels, so they aren't repeated here.
function Overview() {
  const { categories, vehicles, messages, greeting } = useData();
  const isAdmin = useIsAdmin();
  const unread = messages.filter((m) => (m.status || "New") === "New").length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section
        className={`bg-white rounded-2xl border p-6 ${
          isAdmin ? "lg:col-span-2" : "lg:col-span-3"
        } ${unread > 0 ? "border-secondary-500" : "border-slate-200"}`}
      >
        <h2 className="font-semibold text-slate-900">Pesan kontak</h2>
        {unread > 0 ? (
          <>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {unread} pesan belum dibaca
            </p>
            <Link
              to={`${ADMIN_BASE_PATH}/pesan`}
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold"
            >
              Buka pesan
            </Link>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Tidak ada pesan baru. Pesan dari form Kontak di website akan muncul
            di tab Pesan Kontak.
          </p>
        )}
      </section>

      {isAdmin && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900">Greeting signage</h2>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full ${
                greeting?.isActive ? "bg-emerald-600" : "bg-slate-400"
              }`}
            />
            {greeting?.isActive ? "Aktif" : "Nonaktif"}
          </p>
          <Link
            to={`${ADMIN_BASE_PATH}/greeting`}
            className="mt-3 inline-block text-sm font-semibold text-primary-700 hover:underline"
          >
            Kelola greeting
          </Link>
        </section>
      )}

      <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900">Unit per kategori</h2>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Belum ada kategori. Tambahkan di tab Kategori.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {categories.map((c) => {
              const count = vehicles.filter((v) => v.categoryId === c.id).length;
              const pct = vehicles.length ? (count / vehicles.length) * 100 : 0;
              return (
                <li key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className={count ? "text-slate-600" : "font-medium text-secondary-800"}>
                      {count ? `${count} unit` : "Belum ada unit"}
                    </span>
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
        )}
      </section>
    </div>
  );
}

// Shared "role too low" screen for admin-only tabs.
export function AccessDenied({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
      <h2 className="text-xl font-bold text-slate-900">Akses dibatasi</h2>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{children}</p>
      <Link
        to={ADMIN_BASE_PATH}
        className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
      >
        Kembali ke Ringkasan
      </Link>
    </div>
  );
}
