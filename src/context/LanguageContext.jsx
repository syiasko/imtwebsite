import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { interpolate, translations } from "../i18n/translations";

const STORAGE_KEY = "imt-lang";
const SUPPORTED = ["id", "en"];
const DEFAULT_LANG = "id";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANG;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.language || "").slice(0, 2);
    return SUPPORTED.includes(browser) ? browser : DEFAULT_LANG;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      /* noop */
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations[DEFAULT_LANG];
      const fallback = translations[DEFAULT_LANG];
      const raw = dict[key] ?? fallback[key] ?? key;
      return interpolate(raw, vars);
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, supported: SUPPORTED }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
