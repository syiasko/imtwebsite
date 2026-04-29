import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import {
  DEFAULT_ADMIN_PASSWORD,
  sha256Hex,
  verifyAdminPassword,
} from "../../firebase/password";
import { ADMIN_BASE_PATH, isCurrentAdmin } from "../Admin";

export default function AdminSettings() {
  if (!isCurrentAdmin()) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <h2 className="mt-3 text-xl font-bold text-slate-900">
          Akses dibatasi
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Hanya pengguna dengan role <strong>Admin</strong> yang dapat
          mengubah Company Setting (identitas, kontak, YouTube, Maps,
          katalog PDF, password). Hubungi administrator untuk perubahan.
        </p>
        <Link
          to={ADMIN_BASE_PATH}
          className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
        >
          Kembali ke Ringkasan
        </Link>
      </div>
    );
  }
  return <AdminSettingsInner />;
}

function AdminSettingsInner() {
  const { company, updateCompany } = useData();
  const [draft, setDraft] = useState(company);
  const [savingMsg, setSavingMsg] = useState("");
  const [savingErr, setSavingErr] = useState("");

  useEffect(() => {
    setDraft(company);
  }, [company]);

  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setSavingMsg("");
    setSavingErr("");
    try {
      // Auto-derive Maps embed URL from address if user clears the embed field.
      const next = { ...draft };
      if (!next.mapsEmbedUrl && next.address) {
        next.mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
          next.address
        )}&output=embed`;
      }
      await updateCompany(next);
      setSavingMsg("Pengaturan tersimpan.");
      setTimeout(() => setSavingMsg(""), 2500);
    } catch (err) {
      setSavingErr(err.message || "Gagal menyimpan.");
    }
  };

  const onUploadCatalog = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setSavingErr("File harus berformat PDF.");
      return;
    }
    if (file.size > 800 * 1024) {
      setSavingErr(
        "PDF maks 800KB (disimpan di Firestore). Untuk file lebih besar, host PDF di Drive/Dropbox lalu paste URL-nya."
      );
      return;
    }
    setSavingErr("");
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((d) => ({
        ...d,
        catalogPdfUrl: reader.result,
        catalogPdfName: file.name,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeCatalog = () =>
    setDraft((d) => ({ ...d, catalogPdfUrl: "", catalogPdfName: "" }));

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Identitas Perusahaan</h2>
          <p className="text-sm text-slate-500">
            Ditampilkan di seluruh website (footer, kontak, katalog).
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Nama Perusahaan"
            value={draft.name}
            onChange={(v) => update("name", v)}
            required
          />
          <Field
            label="Nama Singkat / Brand"
            value={draft.shortName}
            onChange={(v) => update("shortName", v)}
            hint="Dipakai di logo & footer"
          />
          <Field
            label="Tagline"
            value={draft.tagline}
            onChange={(v) => update("tagline", v)}
            className="md:col-span-2"
          />
          <Field
            label="Telepon"
            value={draft.phone}
            onChange={(v) => update("phone", v)}
          />
          <Field
            label="WhatsApp"
            value={draft.whatsapp}
            onChange={(v) => update("whatsapp", v)}
            hint="Nomor untuk tombol WhatsApp (tanpa spasi/tanda)"
          />
          <Field
            label="Email"
            value={draft.email}
            type="email"
            onChange={(v) => update("email", v)}
          />
          <Field
            label="Jam Operasional"
            value={draft.hours}
            onChange={(v) => update("hours", v)}
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Alamat
            </label>
            <textarea
              rows="3"
              value={draft.address}
              onChange={(e) => update("address", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-bold text-slate-900">YouTube Section</h2>
          <p className="text-sm text-slate-500">
            URL video / playlist / channel. Section akan otomatis menampilkan
            embed yang sesuai.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="URL YouTube"
            value={draft.youtubeUrl}
            onChange={(v) => update("youtubeUrl", v)}
            hint="Contoh: https://www.youtube.com/watch?v=XXXXXXXX"
            className="md:col-span-2"
          />
          <Field
            label="Judul Section"
            value={draft.youtubeSectionTitle}
            onChange={(v) => update("youtubeSectionTitle", v)}
          />
          <Field
            label="Subjudul Section"
            value={draft.youtubeSectionSubtitle}
            onChange={(v) => update("youtubeSectionSubtitle", v)}
          />
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-bold text-slate-900">Google Maps</h2>
          <p className="text-sm text-slate-500">
            Embed URL otomatis dibuat dari alamat. Override manual kalau ingin
            pin tepat: di Google Maps → Share → Embed a map → copy URL <code>src</code>.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Maps Share URL (untuk tombol Buka peta)"
            value={draft.mapsShareUrl}
            onChange={(v) => update("mapsShareUrl", v)}
            className="md:col-span-2"
          />
          <Field
            label="Maps Embed URL (iframe src)"
            value={draft.mapsEmbedUrl}
            onChange={(v) => update("mapsEmbedUrl", v)}
            hint="Kosongkan untuk auto-generate dari alamat"
            className="md:col-span-2"
          />
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-bold text-slate-900">Katalog PDF</h2>
          <p className="text-sm text-slate-500">
            Upload PDF (maks 800KB) atau paste URL eksternal. Tombol "Download
            Katalog" di halaman publik akan memakai file ini.
          </p>
        </div>
        <div className="space-y-3">
          {draft.catalogPdfUrl ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <div className="text-sm">
                <p className="font-medium text-slate-900">
                  📄 {draft.catalogPdfName || "Katalog tersimpan"}
                </p>
                <a
                  href={draft.catalogPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline text-xs"
                >
                  Buka pratinjau
                </a>
              </div>
              <button
                type="button"
                onClick={removeCatalog}
                className="text-sm text-slate-500 hover:text-primary-700"
              >
                Hapus
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Belum ada PDF. User akan diarahkan ke katalog cetak (print) sebagai
              fallback.
            </p>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="cursor-pointer text-sm font-medium px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
              Upload PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={onUploadCatalog}
                className="hidden"
              />
            </label>
            <span className="text-slate-400 text-sm">atau</span>
            <input
              type="url"
              placeholder="URL PDF eksternal"
              value={
                draft.catalogPdfUrl?.startsWith("data:") ? "" : draft.catalogPdfUrl
              }
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  catalogPdfUrl: e.target.value,
                  catalogPdfName: e.target.value
                    ? new URL(
                        e.target.value,
                        "http://x"
                      ).pathname.split("/").pop() || "katalog.pdf"
                    : "",
                }))
              }
              className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            Simpan Pengaturan
          </button>
          {savingMsg && (
            <span className="text-sm text-emerald-700">{savingMsg}</span>
          )}
          {savingErr && (
            <span className="text-sm text-primary-700">{savingErr}</span>
          )}
        </div>
      </form>

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const { company, updateCompany } = useData();
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
    const ok = await verifyAdminPassword(currentPwd, company.passwordHash);
    if (!ok) {
      setErr("Password lama salah.");
      return;
    }
    setBusy(true);
    try {
      const hash = await sha256Hex(newPwd);
      await updateCompany({ passwordHash: hash });
      setMsg("Password berhasil diperbarui.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e2) {
      setErr(e2.message || "Gagal menyimpan password.");
    } finally {
      setBusy(false);
    }
  };

  const usingDefault = !company.passwordHash;

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">Ganti Password Admin</h2>
        {usingDefault && (
          <p className="text-xs text-secondary-700 bg-secondary-50 border border-secondary-200 rounded px-3 py-2 mt-2">
            Saat ini masih memakai password default
            <code className="font-mono mx-1">{DEFAULT_ADMIN_PASSWORD}</code>—
            sangat disarankan menggantinya.
          </p>
        )}
      </div>
      <Field
        label="Password Lama"
        type="password"
        value={currentPwd}
        onChange={setCurrentPwd}
        required
      />
      <Field
        label="Password Baru"
        type="password"
        value={newPwd}
        onChange={setNewPwd}
        required
      />
      <Field
        label="Konfirmasi Password Baru"
        type="password"
        value={confirmPwd}
        onChange={setConfirmPwd}
        required
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
        >
          {busy ? "Menyimpan..." : "Ubah Password"}
        </button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
        {err && <span className="text-sm text-primary-700">{err}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
