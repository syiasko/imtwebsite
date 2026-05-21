import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { ADMIN_BASE_PATH, isCurrentAdmin } from "../Admin";

export default function AdminGreeting() {
  if (!isCurrentAdmin()) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <h2 className="mt-3 text-xl font-bold text-slate-900">
          Akses dibatasi
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Hanya pengguna dengan role <strong>Admin</strong> yang dapat
          mengelola pengaturan Live Greeting digital signage. Hubungi administrator untuk akses.
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
  return <AdminGreetingInner />;
}

function AdminGreetingInner() {
  const { greeting, updateGreeting } = useData();
  const [draft, setDraft] = useState({
    isActive: true,
    text: "",
    guestGender: "Bapak/Ibu",
    guestName: "",
    guestTitle: "",
    guestCompany: "",
  });
  const [savingMsg, setSavingMsg] = useState("");
  const [savingErr, setSavingErr] = useState("");

  // Sync draft with Firestore data on load / change
  useEffect(() => {
    if (greeting) {
      setDraft({
        isActive: greeting.isActive ?? true,
        text: greeting.text || "",
        guestGender: greeting.guestGender || "Bapak/Ibu",
        guestName: greeting.guestName || "",
        guestTitle: greeting.guestTitle || "",
        guestCompany: greeting.guestCompany || "",
      });
    }
  }, [greeting]);

  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setSavingMsg("");
    setSavingErr("");
    try {
      await updateGreeting({
        isActive: draft.isActive,
        text: draft.text.trim(),
        guestGender: draft.guestGender,
        guestName: draft.guestName.trim(),
        guestTitle: draft.guestTitle.trim(),
        guestCompany: draft.guestCompany.trim(),
      });
      setSavingMsg("Greeting berhasil diperbarui secara live!");
      setTimeout(() => setSavingMsg(""), 3500);
    } catch (err) {
      setSavingErr(err.message || "Gagal menyimpan greeting.");
    }
  };

  const clearForm = () => {
    setDraft({
      isActive: true,
      text: "",
      guestGender: "Bapak/Ibu",
      guestName: "",
      guestTitle: "",
      guestCompany: "",
    });
  };

  // Helper to compile dynamic greeting item for the live simulator
  const renderGreetingPreviewText = () => {
    const hasName = !!draft.guestName?.trim();
    const hasTitle = !!draft.guestTitle?.trim();
    const hasCompany = !!draft.guestCompany?.trim();
    const hasA = hasName || hasTitle || hasCompany;

    const baseText = draft.text?.trim() || "Selamat Datang di IMT Karoseri — Mitra Terpercaya Kendaraan Khusus Indonesia";
    const prefix = "Selamat Datang";
    
    // Strip "Selamat Datang" from B text if it starts with it
    let bText = baseText;
    if (bText.toLowerCase().startsWith(prefix.toLowerCase())) {
      bText = bText.slice(prefix.length).trim();
    }

    if (hasA) {
      return (
        <span className="flex items-center gap-2">
          {/* A Part */}
          <span className="text-secondary-400 font-extrabold">Selamat Datang</span>
          
          {hasName && (
            <>
              <span>{draft.guestGender || "Bapak/Ibu"}</span>
              <span className="text-secondary-400 font-black underline decoration-secondary-500/40 decoration-2 underline-offset-4">
                {draft.guestName}
              </span>
            </>
          )}

          {hasTitle && (
            hasName ? (
              <span className="text-primary-200 font-semibold">({draft.guestTitle})</span>
            ) : (
              <span className="text-primary-200 font-semibold">{draft.guestTitle}</span>
            )
          )}

          {hasCompany && (
            <>
              <span className="opacity-80">dari</span>
              <span className="text-white font-extrabold">{draft.guestCompany}</span>
            </>
          )}

          {/* B Part */}
          {bText && <span className="opacity-90">{bText}</span>}
        </span>
      );
    }

    // Fallback: only display B
    if (baseText.toLowerCase().startsWith(prefix.toLowerCase())) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-secondary-400 font-extrabold">Selamat Datang</span>
          <span>{baseText.slice(prefix.length)}</span>
        </span>
      );
    }
    return <span>{baseText}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Visual Live Simulator */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes previewMarquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .preview-animate-marquee {
            display: flex;
            width: max-content;
            animation: previewMarquee 20s linear infinite;
          }
        `}} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Preview Simulator (Signage TV View)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulasi tampilan pada billboard/kiosk signage secara waktu-nyata
            </p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
            draft.isActive 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-slate-800 text-slate-500 border border-slate-700"
          }`}>
            {draft.isActive ? "Aktif di TV" : "Nonaktif di TV"}
          </span>
        </div>

        {/* Marquee Bar Emulator */}
        <div className={`h-[80px] rounded-xl border border-white/10 shadow-inner relative overflow-hidden flex items-center transition-all duration-500 ${
          draft.isActive 
            ? "bg-gradient-to-r from-primary-900 via-primary-700 to-primary-900 opacity-100 scale-100" 
            : "bg-slate-950 opacity-40 scale-[0.99] border-dashed border-slate-800"
        }`}>
          {draft.isActive ? (
            <>
              {/* Badge element */}
              <div className="relative z-10 h-full flex-shrink-0 bg-secondary-500 flex items-center px-6 skew-x-[-12deg] origin-top-left -ml-2 pr-8 shadow-md border-r-2 border-white/10">
                <div className="skew-x-[12deg] flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                  </span>
                  <span className="text-primary-950 font-black tracking-widest text-sm uppercase">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Scrolling Text */}
              <div className="flex-1 overflow-hidden relative flex items-center h-full pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-primary-900 to-transparent z-20 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-primary-900 to-transparent z-20 pointer-events-none"></div>
                <div className="flex w-full overflow-hidden items-center">
                  <div className="preview-animate-marquee flex items-center whitespace-nowrap gap-12 text-lg font-bold text-white">
                    <span className="flex items-center gap-6">
                      {renderGreetingPreviewText()}
                      <span className="text-secondary-400 text-xl font-normal">◆</span>
                    </span>
                    <span className="flex items-center gap-6">
                      {renderGreetingPreviewText()}
                      <span className="text-secondary-400 text-xl font-normal">◆</span>
                    </span>
                    <span className="flex items-center gap-6">
                      {renderGreetingPreviewText()}
                      <span className="text-secondary-400 text-xl font-normal">◆</span>
                    </span>
                    <span className="flex items-center gap-6">
                      {renderGreetingPreviewText()}
                      <span className="text-secondary-400 text-xl font-normal">◆</span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full text-center text-slate-500 font-medium text-sm flex items-center justify-center gap-2">
              <span>🔇 Bar greeting saat ini dinonaktifkan</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={onSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola Live Greeting</h2>
          <p className="text-sm text-slate-500">
            Gunakan kolom di bawah ini untuk menyambut tamu kehormatan/spesifik, atau gunakan baris teks bebas umum.
          </p>
        </div>

        {/* Live Banner Activation */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-bold text-slate-800 block cursor-pointer" htmlFor="isActive">
              Aktifkan Greeting Bar
            </label>
            <p className="text-xs text-slate-500">
              Aktifkan untuk langsung menampilkan banner berjalan di bagian atas aplikasi Signage & Screensaver.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="isActive"
              checked={draft.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Section: Structured Guests */}
        <div className="border border-slate-100 rounded-xl p-5 bg-gradient-to-br from-slate-50/50 via-white to-slate-50/50 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-lg">👑</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Menyambut Tamu Spesifik (Rekomendasi)</h3>
              <p className="text-xs text-slate-500">Formulir terstruktur khusus untuk penyambutan pejabat, kementerian, atau delegasi instansi.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Panggilan / Gender
              </label>
              <div className="bg-slate-100 p-1 rounded-lg flex gap-1 h-[38px] items-stretch border border-slate-200">
                {["Bapak", "Ibu", "Bapak/Ibu"].map((opt) => {
                  const isActive = (draft.guestGender || "Bapak/Ibu") === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update("guestGender", opt)}
                      className={`flex-1 text-center rounded-md text-[11px] font-bold transition-all flex items-center justify-center ${
                        isActive
                          ? "bg-primary-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-slate-400 font-medium">
                Panggilan kehormatan sebelum nama
              </p>
            </div>
            <Field
              label="Nama Lengkap Tamu"
              value={draft.guestName}
              onChange={(v) => update("guestName", v)}
              placeholder="Contoh: Budi Santoso"
              hint="Format bold-gold dengan garis bawah hias"
            />
            <Field
              label="Jabatan / Posisi Tamu"
              value={draft.guestTitle}
              onChange={(v) => update("guestTitle", v)}
              placeholder="Contoh: Menteri"
              hint="Ditampilkan dalam tanda kurung soft-blue"
            />
            <Field
              label="Nama Perusahaan / Instansi"
              value={draft.guestCompany}
              onChange={(v) => update("guestCompany", v)}
              placeholder="Contoh: Kementerian ESDM"
              hint="Ditampilkan dalam format bold-white"
            />
          </div>
        </div>

        {/* Section: Free Text / Fallback */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Teks Greeting Umum / Fallback
          </label>
          <textarea
            rows="3"
            value={draft.text}
            onChange={(e) => update("text", e.target.value)}
            placeholder="Selamat Datang di IMT Karoseri — Mitra Terpercaya Kendaraan Khusus Indonesia"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
          />
          <p className="text-xs text-slate-500">
            Digunakan otomatis sebagai teks berjalan jika kolom **Nama Lengkap Tamu** di atas kosong.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold transition-all shadow-md active:scale-95"
          >
            Simpan Pengaturan Greeting
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition-all"
          >
            Reset Form
          </button>

          {savingMsg && (
            <span className="text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 animate-fade-in flex items-center gap-1.5">
              <span>✅</span> {savingMsg}
            </span>
          )}
          {savingErr && (
            <span className="text-sm text-primary-700 font-bold bg-primary-50 px-3 py-1.5 rounded-md border border-primary-100 animate-fade-in flex items-center gap-1.5">
              <span>⚠️</span> {savingErr}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  hint,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 placeholder-slate-400"
      />
      {hint && <p className="mt-1 text-[10px] text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}
