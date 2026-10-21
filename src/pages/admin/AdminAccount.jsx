import { useId, useState } from "react";
import { authErrorMessage, useAuth } from "../../context/AuthContext";

// Every user (admin or editor) changes their own password here.
export default function AdminAccount() {
  const { username, changePassword } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (newPwd.length < 6) {
      setErr("Password baru minimal 6 karakter.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setErr("Konfirmasi password tidak cocok.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPwd, newPwd);
      setMsg("Password berhasil diperbarui.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e2) {
      setErr(
        e2?.code === "wrong_current_password" ? "Password lama salah." : authErrorMessage(e2)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">Ganti password</h2>
        <p className="mt-1 text-sm text-slate-600">
          Untuk akun <span className="font-mono font-semibold">{username}</span>.
        </p>
      </div>
      <Field
        label="Password lama"
        autoComplete="current-password"
        value={currentPwd}
        onChange={setCurrentPwd}
      />
      <Field
        label="Password baru"
        autoComplete="new-password"
        value={newPwd}
        onChange={setNewPwd}
        hint="Minimal 6 karakter."
      />
      <Field
        label="Konfirmasi password baru"
        autoComplete="new-password"
        value={confirmPwd}
        onChange={setConfirmPwd}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : "Ubah password"}
        </button>
        {msg && <span role="status" className="text-sm text-emerald-800">{msg}</span>}
        {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
      </div>
    </form>
  );
}

function Field({ label, value, onChange, autoComplete, hint }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        <span className="text-primary-600"> *</span>
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
