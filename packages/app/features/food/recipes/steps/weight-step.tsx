'use client';

import { useTranslation } from '@mybela/i18n';
import { Icon, Text, Weight } from '@mybela/ui';
import { View } from 'react-native';
import type { RecipeDraft } from '../draft-store';
import { AmountInput, StepButton, StepTitle } from './fields';
import { rawTotal } from './ingredients-step';

const MAX_SERVINGS = 50;

/**
 * Step 3: the finished dish's weight (the backend needs it to turn raw grams into a cooked
 * portion) and how many servings the pot makes.
 */
export function WeightStep({
  draft,
  update,
  showErrors,
}: {
  draft: RecipeDraft;
  update: (patch: Partial<RecipeDraft>) => void;
  showErrors: boolean;
}) {
  const { t } = useTranslation();
  const raw = Math.round(rawTotal(draft.ingredients));

  return (
    <View className="gap-7">
      <StepTitle title={t('food.recipes.weight.title')} />

      <View className="gap-3">
        <Text className="font-semibold">{t('food.recipes.weight.finishedLabel')}</Text>
        <AmountInput
          big
          value={draft.finishedGrams}
          onChange={(finishedGrams) => update({ finishedGrams })}
          label={t('food.recipes.weight.finishedLabel')}
          invalid={showErrors && !draft.finishedGrams}
        />
        <View className="bg-muted/60 flex-row gap-3 rounded-2xl p-4">
          <Icon as={Weight} size={18} className="text-muted-foreground mt-0.5" />
          <View className="flex-1 gap-1">
            <Text className="text-sm leading-5">{t('food.recipes.weight.finishedHint')}</Text>
            <Text className="text-muted-foreground text-sm">
              {t('food.recipes.weight.rawCompare', { grams: raw.toLocaleString() })}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Text className="font-semibold">{t('food.recipes.weight.servingsLabel')}</Text>
        <View className="bg-card border-border flex-row items-center justify-between rounded-3xl border p-3">
          <StepButton
            big
            kind="less"
            label={t('food.recipes.weight.fewer')}
            disabled={draft.servings <= 1}
            onPress={() => update({ servings: Math.max(1, draft.servings - 1) })}
          />
          <Text className="text-xl font-bold" aria-live="polite">
            {t('food.recipes.weight.servings', { count: draft.servings })}
          </Text>
          <StepButton
            big
            kind="more"
            label={t('food.recipes.weight.more')}
            disabled={draft.servings >= MAX_SERVINGS}
            onPress={() => update({ servings: Math.min(MAX_SERVINGS, draft.servings + 1) })}
          />
        </View>
      </View>
    </View>
  );
}
