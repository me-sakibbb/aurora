'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Flag, Icon, Input, Text } from '@aurora/ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Sheet } from '../../../components/sheet';
import { FormField } from '../../auth/components/form';

/**
 * "Flag a missing food" (F5). The form is complete, but sending waits for the backend's
 * `POST /food/missing` (proposed in @aurora/api food/types.ts), so the button says so.
 * What's typed is kept here, outside the sheet, so closing and reopening doesn't lose it.
 */
export function MissingFoodSheet({
  open,
  query,
  onClose,
}: {
  open: boolean;
  /** The search that found nothing; prefills the name. */
  query: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setName((current) => current || query.trim());
  }, [open, query]);

  return (
    <Sheet open={open} onClose={onClose} label={t('food.missing.title')}>
      <View className="bg-taupe/30 mb-4 h-12 w-12 items-center justify-center rounded-2xl">
        <Icon as={Flag} size={22} className="text-olive" />
      </View>
      <Text className="mb-1 text-xl font-bold tracking-tight">{t('food.missing.title')}</Text>
      <Text variant="muted" className="mb-5 leading-5">
        {t('food.missing.subtitle')}
      </Text>

      <View className="gap-4">
        <FormField label={t('food.missing.name')}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('food.missing.namePlaceholder')}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={120}
          />
        </FormField>
        <FormField label={t('food.missing.note')} hint={t('food.missing.noteHint')}>
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={t('food.missing.notePlaceholder')}
            multiline
            textAlignVertical="top"
            autoCorrect={false}
            spellCheck={false}
            maxLength={500}
            className="h-24 py-3"
          />
        </FormField>
      </View>

      <Button size="lg" className="mt-6 rounded-full" disabled aria-disabled>
        <Text>{t('food.missing.send')}</Text>
        <View className="bg-primary-foreground/20 rounded-full px-2 py-0.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider">
            {t('shell.soon')}
          </Text>
        </View>
      </Button>
      <Text variant="muted" className="mt-2.5 text-center text-xs leading-4">
        {t('food.missing.soonNote')}
      </Text>
    </Sheet>
  );
}
