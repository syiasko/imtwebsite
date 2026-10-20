import { useEffect, useId, useState } from "react";
import { useData } from "../../context/DataContext";
import { AccessDenied, isCurrentAdmin } from "../Admin";

const DEFAULT_TEXT =
  "Selamat Datang di IMT Karoseri, Mitra Terpercaya Kendaraan Khusus Indonesia";

export default function AdminGreeting() {
  if (!isCurrentAdmin()) {
    return (
      <AccessDenied>
        Hanya pengguna dengan role <strong>Admin</strong> yang dapat mengelola
        greeting digital signage. Hubungi administrator untuk akses.
      </AccessDenied>
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
  const textId = useId();

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
      setSavingMsg("Greeting tersimpan dan langsung tampil di signage.");
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

    const baseText = draft.text?.trim() || DEFAULT_TEXT;
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
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 relative overflow-hidden">
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
          @media (prefers-reduced-motion: reduce) {
            .preview-animate-marquee { animation: none; }
          }
        `}} />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Pratinjau tampilan signage
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Mengikuti isi form di bawah. Perubahan baru tampil di TV setelah
              disimpan.
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
            draft.isActive
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-300 border border-slate-700"
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
            <div className="w-full text-center text-slate-300 font-medium text-sm">
              Bar greeting sedang nonaktif
            </div>
          )}
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={onSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola Live Greeting</h2>
          <p className="text-sm text-slate-600">
            Isi data tamu untuk menyambut tamu tertentu, atau cukup isi teks
            greeting umum.
          </p>
        </div>

        {/* Live Banner Activation */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-bold text-slate-800 block cursor-pointer" htmlFor="isActive">
              Aktifkan Greeting Bar
            </label>
            <p className="text-xs text-slate-600">
              Menampilkan teks berjalan di bagian atas aplikasi Signage & Screensaver.
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
            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary-600 peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Section: Structured Guests */}
        <div className="border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Data tamu</h3>
            <p className="text-xs text-slate-600">
              Untuk menyambut pejabat, kementerian, atau delegasi instansi.
              Kosongkan semua jika tidak ada tamu khusus.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p id="gender-label" className="block text-xs font-bold text-slate-700 mb-1">
                Panggilan
              </p>
              <div
                role="group"
                aria-labelledby="gender-label"
                className="bg-slate-100 p-1 rounded-lg flex gap-1 h-[38px] items-stretch border border-slate-200"
              >
                {["Bapak", "Ibu", "Bapak/Ibu"].map((opt) => {
                  const isActive = (draft.guestGender || "Bapak/Ibu") === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update("guestGender", opt)}
                      aria-pressed={isActive}
                      className={`flex-1 text-center rounded-md text-xs font-bold transition-all flex items-center justify-center ${
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
              <p className="mt-1 text-xs text-slate-600">
                Ditulis sebelum nama tamu
              </p>
            </div>
            <Field
              label="Nama Lengkap Tamu"
              value={draft.guestName}
              onChange={(v) => update("guestName", v)}
              placeholder="Contoh: Budi Santoso"
              hint="Contoh tampilan: Bapak Budi Santoso"
            />
            <Field
              label="Jabatan / Posisi Tamu"
              value={draft.guestTitle}
              onChange={(v) => update("guestTitle", v)}
              placeholder="Contoh: Menteri"
              hint="Ditulis dalam kurung setelah nama"
            />
            <Field
              label="Nama Perusahaan / Instansi"
              value={draft.guestCompany}
              onChange={(v) => update("guestCompany", v)}
              placeholder="Contoh: Kementerian ESDM"
              hint='Ditulis setelah kata "dari"'
            />
          </div>
        </div>

        {/* Section: Free Text / Fallback */}
        <div className="space-y-2">
          <label htmlFor={textId} className="block text-sm font-bold text-slate-800">
            Teks greeting umum
          </label>
          <textarea
            id={textId}
            rows="3"
            value={draft.text}
            onChange={(e) => update("text", e.target.value)}
            placeholder={DEFAULT_TEXT}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
          />
          <p className="text-xs text-slate-600">
            Selalu tampil di teks berjalan. Jika data tamu diisi, teks ini
            muncul setelah nama tamu. Jika dikosongkan, dipakai teks bawaan.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
          >
            Simpan Pengaturan Greeting
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
          >
            Reset Form
          </button>

          {savingMsg && (
            <span role="status" className="text-sm text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              {savingMsg}
            </span>
          )}
          {savingErr && (
            <span role="alert" className="text-sm text-red-800 font-semibold bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
              {savingErr}
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
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 placeholder-slate-500"
      />
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
