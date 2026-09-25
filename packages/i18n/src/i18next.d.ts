import 'i18next';
import type en from './locales/en.json';

// Typed translation keys: t('home.title') autocompletes and typos fail typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    returnNull: false;
  }
}
