import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dict, type Lang, type TKey } from './dict';
import { translate } from './translate';

interface I18nApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nApi | null>(null);

function initialLang(): Lang {
  const saved = localStorage.getItem('wnap.lang');
  return saved === 'en' ? 'en' : 'vi';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('wnap.lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(dict, lang, key, vars),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
