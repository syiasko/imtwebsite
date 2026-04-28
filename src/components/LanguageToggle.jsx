import { useT } from "../context/LanguageContext";

const FLAGS = {
  id: { code: "ID", emoji: "🇮🇩", label: "Bahasa Indonesia" },
  en: { code: "EN", emoji: "🇬🇧", label: "English" },
};

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, supported } = useT();

  return (
    <div
      className={`inline-flex rounded-full border border-slate-200 bg-white overflow-hidden text-sm ${
        compact ? "scale-95" : ""
      }`}
      role="group"
      aria-label="Language switcher"
    >
      {supported.map((code) => {
        const active = lang === code;
        const f = FLAGS[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            title={f.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition ${
              active
                ? "bg-primary-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span aria-hidden="true">{f.emoji}</span>
            <span className="font-semibold tracking-wide">{f.code}</span>
          </button>
        );
      })}
    </div>
  );
}
