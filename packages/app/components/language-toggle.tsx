'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Text } from '@aurora/ui';
import { useLanguage } from '../lib/language';

/** Shows the *other* language in its own script, so people can find it without reading the current one. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-full px-4"
      aria-label={t('common.languageToggleLabel')}
      onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')}
    >
      <Text>{t('common.languageToggle')}</Text>
    </Button>
  );
}
