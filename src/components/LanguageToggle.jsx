import { useT } from "../context/LanguageContext";

const FLAGS = {
  id: { code: "ID", label: "Bahasa Indonesia" },
  en: { code: "EN", label: "English" },
};

export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, supported, t } = useT();

  return (
    <div
      className={`inline-flex rounded-full border border-slate-200 bg-white overflow-hidden text-sm ${
        compact ? "scale-95" : ""
      }`}
      role="group"
      aria-label={t("lang.label")}
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
            aria-label={f.label}
            className={`flex items-center h-11 px-4 transition ${
              active
                ? "bg-primary-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="font-semibold">{f.code}</span>
          </button>
        );
      })}
    </div>
  );
}
