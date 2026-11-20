'use client';

import { useTranslation } from '@mybela/i18n';
import { Button, Icon, Text, Trash2 } from '@mybela/ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Sheet } from '../../../../components/sheet';
import { AmountInput, StepButton } from '../steps/fields';
import { IngredientTile } from './ingredient-tile';

const STEP_GRAMS = 10;

export type AmountTarget = {
  food_id: string;
  name: string;
  secondary: string | null;
  image_url: string | null;
  /** Set when it's already in the recipe. */
  grams: number | null;
  added: boolean;
};

/**
 * "How much rice?": picked from the ingredient list, or tapped in the recipe to change it. One big
 * grams field with −/+, then Add (or Update / Remove for one already in the recipe).
 */
export function AmountSheet({
  target,
  open,
  onClose,
  onSave,
  onRemove,
}: {
  /** Kept while closing so the content doesn't vanish mid-animation. */
  target: AmountTarget | null;
  open: boolean;
  onClose: () => void;
  onSave: (grams: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [grams, setGrams] = useState<number | null>(null);
  const targetId = target?.food_id;
  useEffect(() => {
    if (open) setGrams(target?.grams ?? null);
  }, [open, targetId, target?.grams]);
  if (!target) return null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={t('food.recipes.ingredients.amountTitle', { name: target.name })}
    >
      <View className="gap-5">
        <View className="flex-row items-center gap-4">
          <IngredientTile uri={target.image_url} size="lg" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text role="heading" aria-level={2} className="text-xl font-bold leading-7">
              {t('food.recipes.ingredients.amountTitle', { name: target.name })}
            </Text>
            {target.secondary ? (
              <Text className="text-muted-foreground">{target.secondary}</Text>
            ) : null}
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <StepButton
            big
            kind="less"
            label={t('food.recipes.ingredients.less')}
            disabled={!grams || grams <= STEP_GRAMS}
            onPress={() => setGrams(Math.max(STEP_GRAMS, (grams ?? 0) - STEP_GRAMS))}
          />
          <AmountInput
            big
            className="flex-1"
            value={grams}
            onChange={setGrams}
            label={t('food.recipes.ingredients.gramsLabel', { name: target.name })}
          />
          <StepButton
            big
            kind="more"
            label={t('food.recipes.ingredients.more')}
            onPress={() => setGrams((grams ?? 0) + STEP_GRAMS)}
          />
        </View>
        <Text className="text-muted-foreground -mt-2 text-sm leading-5">
          {t('food.recipes.ingredients.amountHint')}
        </Text>

        <Button
          size="lg"
          className="rounded-full"
          disabled={!grams}
          onPress={() => grams && onSave(grams)}
        >
          <Text>
            {target.added
              ? t('food.recipes.ingredients.update')
              : t('food.recipes.ingredients.addToRecipe')}
          </Text>
        </Button>
        {target.added ? (
          <Button variant="ghost" className="-mt-2 rounded-full" onPress={onRemove}>
            <Icon as={Trash2} size={16} className="text-destructive" />
            <Text className="text-destructive">
              {t('food.recipes.ingredients.removeFromRecipe')}
            </Text>
          </Button>
        ) : null}
      </View>
    </Sheet>
  );
}
