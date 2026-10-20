import { useEffect, useId, useState } from "react";
import { useData } from "../../context/DataContext";
import {
  DEFAULT_ADMIN_PASSWORD,
  sha256Hex,
  verifyAdminPassword,
} from "../../firebase/password";
import { AccessDenied, isCurrentAdmin } from "../Admin";
import {
  DEFAULT_MAPS_PLACE_QUERY,
  buildMapsEmbedUrl,
} from "../../data/initialData";

export default function AdminSettings() {
  if (!isCurrentAdmin()) {
    return (
      <AccessDenied>
        Hanya pengguna dengan role <strong>Admin</strong> yang dapat mengubah
        Company Setting (identitas, kontak, YouTube, Maps, katalog PDF,
        password). Hubungi administrator untuk perubahan.
      </AccessDenied>
    );
  }
  return <AdminSettingsInner />;
}

function AdminSettingsInner() {
  const { company, updateCompany } = useData();
  const [draft, setDraft] = useState(company);
  const [savingMsg, setSavingMsg] = useState("");
  const [savingErr, setSavingErr] = useState("");
  const addressId = useId();
  const embedId = useId();

  useEffect(() => {
    setDraft(company);
  }, [company]);

  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setSavingMsg("");
    setSavingErr("");
    try {
      // Auto-derive Maps embed URL when admin clears the field. Prefer the
      // recognised Place query (drops a properly labelled pin), fall back
      // to address only when no place query is set.
      const next = { ...draft };
      if (!next.mapsEmbedUrl) {
        const fallbackQuery =
          next.mapsPlaceQuery?.trim() ||
          DEFAULT_MAPS_PLACE_QUERY ||
          next.address;
        if (fallbackQuery) {
          next.mapsEmbedUrl = buildMapsEmbedUrl(fallbackQuery);
        }
      }
      await updateCompany(next);
      setSavingMsg("Pengaturan tersimpan.");
      setTimeout(() => setSavingMsg(""), 2500);
    } catch (err) {
      setSavingErr(err.message || "Gagal menyimpan.");
    }
  };

  const applyMapsDefault = () => {
    const query =
      draft.mapsPlaceQuery?.trim() || DEFAULT_MAPS_PLACE_QUERY;
    setDraft((d) => ({
      ...d,
      mapsPlaceQuery: query,
      mapsEmbedUrl: buildMapsEmbedUrl(query),
    }));
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
          <p className="text-sm text-slate-600">
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
            <label htmlFor={addressId} className="block text-sm font-medium text-slate-700 mb-1">
              Alamat
            </label>
            <textarea
              id={addressId}
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
          <p className="text-sm text-slate-600">
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
          <p className="text-sm text-slate-600">
            Pin di footer dibuat dari "Maps Place Query". Gunakan nama
            tempat yang sudah terdaftar di Google Maps (mis.{" "}
            <code>{DEFAULT_MAPS_PLACE_QUERY}</code>) supaya marker tampil
            dengan label yang benar. Kalau perlu kontrol penuh, paste
            <code> src</code> embed dari Google Maps (menu Share, lalu Embed a
            map).
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
            label="Maps Place Query (nama tempat di Google Maps)"
            value={draft.mapsPlaceQuery}
            onChange={(v) => update("mapsPlaceQuery", v)}
            hint="Pin akan dijatuhkan ke tempat dengan nama persis ini di Google Maps."
            className="md:col-span-2"
          />
          <div className="md:col-span-2">
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor={embedId} className="block text-sm font-medium text-slate-700">
                Maps Embed URL (iframe src)
              </label>
              <button
                type="button"
                onClick={applyMapsDefault}
                className="text-xs font-semibold text-primary-700 hover:underline"
              >
                Pakai default dari Place Query
              </button>
            </div>
            <input
              id={embedId}
              type="text"
              value={draft.mapsEmbedUrl || ""}
              onChange={(e) => update("mapsEmbedUrl", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
            <p className="mt-1 text-xs text-slate-600">
              Kosongkan untuk auto-rebuild dari Place Query saat disimpan.
            </p>
          </div>
        </div>

        <hr className="border-slate-200" />

        <div>
          <h2 className="text-lg font-bold text-slate-900">Katalog PDF</h2>
          <p className="text-sm text-slate-600">
            Upload PDF (maks 800KB) atau paste URL eksternal. Tombol "Download
            Katalog" di halaman publik akan memakai file ini.
          </p>
        </div>
        <div className="space-y-3">
          {draft.catalogPdfUrl ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <div className="text-sm">
                <p className="font-medium text-slate-900">
                  {draft.catalogPdfName || "Katalog tersimpan"}
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
                className="text-sm text-slate-600 hover:text-red-700"
              >
                Hapus
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Belum ada PDF. Pengunjung akan diarahkan ke halaman katalog cetak
              sebagai gantinya.
            </p>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            {/* sr-only (not display:none) keeps the file input reachable by Tab */}
            <label className="cursor-pointer text-sm font-medium px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary-600">
              Upload PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={onUploadCatalog}
                className="sr-only"
              />
            </label>
            <span className="text-slate-600 text-sm">atau</span>
            <input
              type="url"
              aria-label="URL PDF eksternal"
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
            <span role="status" className="text-sm text-emerald-800">{savingMsg}</span>
          )}
          {savingErr && (
            <span role="alert" className="text-sm text-red-700">{savingErr}</span>
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
            <code className="font-mono mx-1">{DEFAULT_ADMIN_PASSWORD}</code>.
            Segera ganti password ini.
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
        {msg && <span role="status" className="text-sm text-emerald-800">{msg}</span>}
        {err && <span role="alert" className="text-sm text-red-700">{err}</span>}
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
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
