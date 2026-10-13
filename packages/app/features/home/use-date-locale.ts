import { useTranslation } from '@aurora/i18n';
import { bn, enUS } from 'date-fns/locale';

/** date-fns locale matching the app language, for day and month names. */
export function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language === 'bn' ? bn : enUS;
}
