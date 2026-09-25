import { kv } from '@aurora/api';
import { i18n, isLanguage, type Language, useTranslation } from '@aurora/i18n';
import { useCallback, useEffect } from 'react';

const STORAGE_KEY = 'aurora.language';

/** Applies the saved language after mount (not during render, so web SSR hydration stays stable). */
export function useRestoreLanguage() {
  useEffect(() => {
    const saved = kv.get(STORAGE_KEY);
    if (isLanguage(saved) && saved !== i18n.language) {
      void i18n.changeLanguage(saved);
    }
  }, []);
}

export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const language = (isLanguage(instance.language) ? instance.language : 'en') as Language;

  const setLanguage = useCallback((next: Language) => {
    kv.set(STORAGE_KEY, next);
    void i18n.changeLanguage(next);
  }, []);

  return { language, setLanguage };
}
