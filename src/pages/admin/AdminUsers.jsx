import { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { ConfirmDialog } from "../../components/Modal";

const emptyDraft = {
  id: "",
  username: "",
  name: "",
  role: "admin",
  password: "",
};

export default function AdminUsers() {
  const { users, upsertUser, deleteUser } = useData();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [savingMsg, setSavingMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const editing = !!draft.id;
  const currentUserId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("imt-admin-user-id")
      : null;

  const startEdit = (u) =>
    setDraft({
      id: u.id,
      username: u.username,
      name: u.name || "",
      role: u.role || "admin",
      password: "",
    });
  const cancel = () => {
    setDraft(emptyDraft);
    setError("");
  };

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.username || "").localeCompare(b.username || "")),
    [users]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSavingMsg("");
    try {
      const conflict = users.find(
        (u) =>
          u.username?.toLowerCase() === draft.username.trim().toLowerCase() &&
          u.id !== draft.id
      );
      if (conflict) {
        setError("Username sudah dipakai user lain.");
        return;
      }
      if (!editing && draft.password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }
      if (editing && draft.password && draft.password.length < 6) {
        setError("Password baru minimal 6 karakter.");
        return;
      }
      await upsertUser(draft);
      setDraft(emptyDraft);
      setSavingMsg(editing ? "User diperbarui." : "User ditambahkan.");
      setTimeout(() => setSavingMsg(""), 2500);
    } catch (err) {
      setError(err.message || "Gagal menyimpan user.");
    }
  };

  const onDeleteConfirm = async () => {
    const u = confirmDelete;
    setConfirmDelete(null);
    if (!u) return;
    try {
      await deleteUser(u.id);
      if (draft.id === u.id) cancel();
    } catch (err) {
      setError(err.message || "Gagal menghapus user.");
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Daftar Pengguna</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              User yang dapat login & mengelola konten admin panel.
            </p>
          </div>
          <span className="text-sm text-slate-500">
            {users.length} pengguna
          </span>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-3">Username</th>
              <th className="text-left px-5 py-3">Nama</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <p className="font-mono font-medium text-slate-900">
                    {u.username}
                  </p>
                  {u.id === currentUserId && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                      Anda
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-700">{u.name || "—"}</td>
                <td className="px-5 py-3">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                    {u.role || "admin"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-sm font-medium text-primary-700 hover:underline mr-3"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => setConfirmDelete(u)}
                    disabled={u.id === currentUserId}
                    className="text-sm font-medium text-slate-500 hover:text-primary-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      u.id === currentUserId
                        ? "Tidak bisa menghapus akun sendiri"
                        : ""
                    }
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                  Belum ada pengguna. Tambahkan user pertama di panel kanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 h-fit space-y-4"
      >
        <h2 className="font-semibold text-slate-900">
          {editing ? "Ubah Pengguna" : "Tambah Pengguna"}
        </h2>

        <Field
          label="Username"
          required
          value={draft.username}
          onChange={(v) => setDraft({ ...draft, username: v })}
          hint="Hanya huruf kecil, angka, dan tanda hubung. Otomatis lowercase."
        />
        <Field
          label="Nama Lengkap"
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role
          </label>
          <select
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="admin">Admin (full access)</option>
            <option value="editor">Editor (manage content)</option>
          </select>
        </div>
        <Field
          label={editing ? "Password Baru (opsional)" : "Password"}
          type="password"
          required={!editing}
          value={draft.password}
          onChange={(v) => setDraft({ ...draft, password: v })}
          hint={editing ? "Kosongkan jika tidak ingin mengganti password." : "Minimal 6 karakter."}
        />

        {error && (
          <p className="text-sm text-primary-700 bg-primary-50 px-3 py-2 rounded">
            {error}
          </p>
        )}
        {savingMsg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded">
            {savingMsg}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            {editing ? "Simpan Perubahan" : "Tambah User"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Pengguna?"
        description={
          confirmDelete
            ? `User "${confirmDelete.username}" akan dihapus dan tidak bisa login lagi. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={onDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
