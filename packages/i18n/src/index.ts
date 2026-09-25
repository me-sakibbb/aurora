import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bn from './locales/bn.json';
import en from './locales/en.json';

export const languages = ['en', 'bn'] as const;
export type Language = (typeof languages)[number];
export const defaultLanguage: Language = 'en';

export const resources = {
  en: { translation: en },
  bn: { translation: bn },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (languages as readonly string[]).includes(value);
}

export { Trans, useTranslation } from 'react-i18next';
export { i18n };
