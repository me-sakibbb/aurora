'use client';

import { photoUrl } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { cn, Icon, Pencil, Text } from '@mybela/ui';
import { Pressable, View } from 'react-native';
import { FoodImage } from '../../../../components/food-image';
import { useLanguage } from '../../../../lib/language';
import { methodLabel } from '../../display';
import { methodIcon } from '../../method-icons';
import { IngredientTile } from '../components/ingredient-tile';
import type { RecipeDraft } from '../draft-store';
import { StepTitle } from './fields';
import { ingredientName, rawTotal } from './ingredients-step';

/**
 * Step 4: the recipe as it will be saved, in three cards that share one layout (title left, Edit
 * right). Save sits in the footer.
 */
export function ReviewStep({
  draft,
  editing,
  onEdit,
}: {
  draft: RecipeDraft;
  editing: boolean;
  onEdit: (step: number) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const uri = draft.photo?.uri ?? photoUrl(draft.photoUrl);
  const raw = Math.round(rawTotal(draft.ingredients));
  const cooked = Math.round(draft.finishedGrams ?? 0);
  const names =
    language === 'bn' && draft.nameBn.trim()
      ? { primary: draft.nameBn.trim(), secondary: draft.name.trim() }
      : { primary: draft.name.trim(), secondary: draft.nameBn.trim() || null };

  return (
    <View className="gap-5">
      <StepTitle
        title={t('food.recipes.review.title')}
        subtitle={t('food.recipes.review.subtitle')}
      />

      {/* The dish: the photo as it will look on its card, then the names. */}
      <View className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm shadow-black/5">
        <View className="bg-sage/15 aspect-[4/3] w-full items-center justify-center">
          <FoodImage
            uri={uri}
            className="absolute inset-0"
            fallback={
              <Icon
                as={methodIcon(draft.method)}
                size={56}
                strokeWidth={1.25}
                className="text-primary/70"
              />
            }
          />
          <View className="bg-card/95 absolute bottom-3 left-3 rounded-full px-3 py-1 shadow-sm shadow-black/10">
            <Text className="text-xs font-semibold">{methodLabel(t, draft.method)}</Text>
          </View>
        </View>
        <View className="gap-3 p-4">
          <CardHeader title={t('food.recipes.review.dish')} onEdit={() => onEdit(0)} />
          <View className="gap-0.5">
            <Text className="text-xl font-bold leading-7">{names.primary}</Text>
            {names.secondary ? (
              <Text className="text-muted-foreground">{names.secondary}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <Card>
        <CardHeader
          title={t('food.recipes.review.ingredients')}
          note={t('food.recipes.ingredients.rawTotal', { grams: raw.toLocaleString() })}
          onEdit={() => onEdit(1)}
        />
        <View>
          {draft.ingredients.map((row, index) => {
            const name = ingredientName(row, language);
            return (
              <View
                key={row.food_id}
                className={cn(
                  'flex-row items-center gap-3 py-2.5',
                  index > 0 && 'border-border border-t',
                )}
              >
                <IngredientTile uri={row.image_url} size="sm" />
                <Text className="min-w-0 flex-1 leading-5" numberOfLines={2}>
                  {name.primary}
                </Text>
                <Text className="w-16 text-right text-sm font-semibold">
                  {t('food.detail.grams', { grams: (row.grams ?? 0).toLocaleString() })}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <CardHeader title={t('food.recipes.review.portions')} onEdit={() => onEdit(2)} />
        <View className="flex-row gap-2">
          <Stat
            label={t('food.recipes.review.raw')}
            value={t('food.detail.grams', { grams: raw.toLocaleString() })}
          />
          <Stat
            label={t('food.recipes.review.cooked')}
            value={t('food.detail.grams', { grams: cooked.toLocaleString() })}
          />
          <Stat label={t('food.recipes.review.servingsStat')} value={String(draft.servings)} />
        </View>
      </Card>

      {editing ? (
        <Text className="text-muted-foreground px-1 text-sm leading-5">
          {t('food.recipes.review.editNote')}
        </Text>
      ) : null}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-card border-border gap-3 rounded-3xl border p-4">{children}</View>;
}

function CardHeader({ title, note, onEdit }: { title: string; note?: string; onEdit: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {title}
      </Text>
      {note ? <Text className="text-muted-foreground flex-1 text-xs">· {note}</Text> : null}
      {note ? null : <View className="flex-1" />}
      <Pressable
        onPress={onEdit}
        role="button"
        aria-label={`${t('food.recipes.review.edit')}: ${title}`}
        hitSlop={8}
        className="bg-primary/10 flex-row items-center gap-1 rounded-full px-3 py-1 active:opacity-60"
      >
        <Icon as={Pencil} size={12} className="text-primary" />
        <Text className="text-primary text-xs font-semibold">{t('food.recipes.review.edit')}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-background flex-1 items-center gap-0.5 rounded-2xl py-3">
      <Text className="text-base font-bold">{value}</Text>
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </View>
  );
}
