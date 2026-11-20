'use client';

import { type Ingredient, needsAddedWater } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Check, ChevronRight, cn, Droplets, Icon, Plus, Text } from '@mybela/ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FadeIn } from '../../../../components/fade-in';
import { Skeleton } from '../../../../components/skeleton';
import { tapHaptic } from '../../../../lib/haptics';
import { useLanguage } from '../../../../lib/language';
import { InlineState } from '../../../home/components/primitives';
import { SearchField } from '../../components/search-field';
import { methodLabel } from '../../display';
import { AmountSheet, type AmountTarget } from '../components/amount-sheet';
import { IngredientTile } from '../components/ingredient-tile';
import type { DraftIngredient, RecipeDraft } from '../draft-store';
import { useAddedWater, useIngredientSearch } from '../queries';
import { StepTitle } from './fields';

/** Total grams typed so far (empty rows count as 0). */
export const rawTotal = (ingredients: DraftIngredient[]) =>
  ingredients.reduce((sum, row) => sum + (row.grams ?? 0), 0);

export const ingredientName = (
  item: { name_en: string; name_bn: string | null },
  language: 'en' | 'bn',
) =>
  language === 'bn' && item.name_bn
    ? { primary: item.name_bn, secondary: item.name_en }
    : { primary: item.name_en, secondary: item.name_bn };

/**
 * Step 2: what goes in the dish. The recipe's ingredients sit on top (tap one to change its
 * amount); below, every ingredient to pick from (A–Z, scrolling loads more) or the matches for
 * what's typed. Picking one asks "how much?" in a small sheet.
 */
export function IngredientsStep({
  draft,
  update,
  showErrors,
  registerEndReached,
}: {
  draft: RecipeDraft;
  update: (patch: Partial<RecipeDraft>) => void;
  showErrors: boolean;
  /** The editor's scroll view calls this near the bottom. */
  registerEndReached: (handler: (() => void) | null) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const list = useIngredientSearch(query);
  const [target, setTarget] = useState<AmountTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Both names of the ingredient in the sheet, saved with it when it's added.
  const [names, setNames] = useState({ name_en: '', name_bn: null as string | null });
  const byId = new Map(draft.ingredients.map((row) => [row.food_id, row]));
  const waterNeeded = needsAddedWater(draft.method, draft.ingredients);
  const water = useAddedWater(waterNeeded).data;

  useEffect(() => {
    registerEndReached(list.hasMore ? list.loadMore : null);
    return () => registerEndReached(null);
  }, [registerEndReached, list.hasMore, list.loadMore]);

  const openAmount = (item: {
    food_id: string;
    name_en: string;
    name_bn: string | null;
    image_url?: string | null;
  }) => {
    tapHaptic();
    const existing = byId.get(item.food_id);
    const name = ingredientName(item, language);
    setNames({ name_en: item.name_en, name_bn: item.name_bn });
    setTarget({
      food_id: item.food_id,
      name: name.primary,
      secondary: name.secondary,
      image_url: item.image_url ?? null,
      grams: existing?.grams ?? null,
      added: Boolean(existing),
    });
    setSheetOpen(true);
  };

  const pick = (item: Ingredient) => openAmount({ ...item, food_id: item.id });

  const saveAmount = (grams: number) => {
    if (!target) return;
    const existing = byId.get(target.food_id);
    if (existing) {
      update({
        ingredients: draft.ingredients.map((row) =>
          row.food_id === target.food_id ? { ...row, grams } : row,
        ),
      });
    } else {
      update({
        ingredients: [
          ...draft.ingredients,
          {
            food_id: target.food_id,
            name_en: names.name_en,
            name_bn: names.name_bn,
            image_url: target.image_url,
            grams,
          },
        ],
      });
      setQuery('');
    }
    setSheetOpen(false);
  };

  const removeTarget = () => {
    if (!target) return;
    update({ ingredients: draft.ingredients.filter((row) => row.food_id !== target.food_id) });
    setSheetOpen(false);
  };

  const total = rawTotal(draft.ingredients);
  // The water notice above explains its own problem.
  const error = !showErrors
    ? null
    : draft.ingredients.length === 0
      ? t('food.recipes.ingredients.needOne')
      : draft.ingredients.some((row) => !row.grams)
        ? t('food.recipes.ingredients.needGrams')
        : null;

  return (
    <View className="gap-6">
      <StepTitle
        title={t('food.recipes.ingredients.title')}
        subtitle={t('food.recipes.ingredients.subtitle')}
      />

      {waterNeeded ? (
        <FadeIn
          className={cn(
            'gap-3 rounded-2xl border px-4 py-3.5',
            showErrors
              ? 'bg-destructive/10 border-destructive/30'
              : 'bg-primary/5 border-primary/20',
          )}
        >
          <View className="flex-row gap-3">
            <Icon
              as={Droplets}
              size={18}
              className={cn('mt-0.5', showErrors ? 'text-destructive' : 'text-primary')}
            />
            <Text
              className={cn('flex-1 text-sm leading-5', showErrors && 'text-destructive')}
              role={showErrors ? 'alert' : undefined}
            >
              {t('food.recipes.ingredients.waterNeeded', {
                method: methodLabel(t, draft.method),
              })}
            </Text>
          </View>
          {water ? (
            <Button
              size="sm"
              className="self-start rounded-full"
              onPress={() => openAmount({ ...water, food_id: water.id })}
            >
              <Icon as={Plus} size={14} className="text-primary-foreground" />
              <Text>{t('food.recipes.ingredients.addWater')}</Text>
            </Button>
          ) : null}
        </FadeIn>
      ) : null}

      {/* The recipe so far. */}
      <View className="gap-2.5">
        <SectionLabel
          title={t('food.recipes.ingredients.yours')}
          trailing={
            draft.ingredients.length > 0
              ? t('food.recipes.ingredients.rawTotal', {
                  grams: Math.round(total).toLocaleString(),
                })
              : undefined
          }
        />
        {draft.ingredients.length === 0 ? (
          <View className="border-border items-center rounded-3xl border border-dashed px-5 py-6">
            <Text className="text-muted-foreground text-center text-sm leading-5">
              {t('food.recipes.ingredients.empty')}
            </Text>
          </View>
        ) : (
          <View className="bg-card border-border overflow-hidden rounded-3xl border">
            {draft.ingredients.map((row, index) => {
              const name = ingredientName(row, language);
              const missing = !row.grams;
              return (
                <FadeIn key={row.food_id}>
                  <Pressable
                    onPress={() => openAmount(row)}
                    role="button"
                    aria-label={t('food.recipes.ingredients.edit', { name: name.primary })}
                    className={cn(
                      'active:bg-muted hover:bg-muted/60 flex-row items-center gap-3 px-3.5 py-3',
                      index > 0 && 'border-border border-t',
                    )}
                  >
                    <IngredientTile uri={row.image_url} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold leading-5" numberOfLines={1}>
                        {name.primary}
                      </Text>
                      {name.secondary ? (
                        <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                          {name.secondary}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      className={cn(
                        'flex-row items-center gap-1 rounded-full px-3 py-1.5',
                        missing && showErrors ? 'bg-destructive/10' : 'bg-background',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-sm font-bold',
                          missing && showErrors && 'text-destructive',
                        )}
                      >
                        {missing
                          ? t('food.recipes.ingredients.setGrams')
                          : t('food.detail.grams', { grams: (row.grams ?? 0).toLocaleString() })}
                      </Text>
                      <Icon as={ChevronRight} size={14} className="text-muted-foreground" />
                    </View>
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        )}
        {error ? (
          <Text className="text-destructive px-1 text-sm" role="alert">
            {error}
          </Text>
        ) : null}
        {waterNeeded ? null : (
          <View className="flex-row items-center gap-2 px-1">
            <Icon as={Droplets} size={15} className="text-muted-foreground" />
            <Text className="text-muted-foreground flex-1 text-sm">
              {t('food.recipes.ingredients.waterHint')}
            </Text>
          </View>
        )}
      </View>

      {/* Everything to pick from. */}
      <View className="gap-3">
        <SectionLabel
          title={
            list.searching
              ? t('food.recipes.ingredients.matches')
              : t('food.recipes.ingredients.allTitle')
          }
        />
        <SearchField
          value={query}
          onChangeText={setQuery}
          onSubmit={() => {
            const first = list.items[0];
            if (first) pick(first);
          }}
          busy={list.waiting && list.searching}
          placeholder={t('food.recipes.ingredients.search')}
          label={t('food.recipes.ingredients.searchLabel')}
        />
        <PickList query={query.trim()} list={list} added={byId} onPick={pick} language={language} />
      </View>

      <AmountSheet
        target={target}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={saveAmount}
        onRemove={removeTarget}
      />
    </View>
  );
}

function SectionLabel({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View className="flex-row items-baseline justify-between px-1">
      <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {title}
      </Text>
      {trailing ? (
        <Text className="text-sm font-semibold" aria-live="polite">
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

function PickList({
  query,
  list,
  added,
  onPick,
  language,
}: {
  query: string;
  list: ReturnType<typeof useIngredientSearch>;
  added: Map<string, DraftIngredient>;
  onPick: (item: Ingredient) => void;
  language: 'en' | 'bn';
}) {
  const { t } = useTranslation();
  if (list.failed) return <InlineState error={list.error} onRetry={list.retry} />;
  if (list.items.length === 0) {
    if (list.waiting) {
      return (
        <View aria-busy className="gap-2">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center gap-3 px-1 py-1.5">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View className="items-center gap-1 px-4 py-6">
        <Text className="text-center font-semibold">
          {t('food.recipes.ingredients.none', { query })}
        </Text>
        <Text className="text-muted-foreground text-center text-sm">
          {t('food.recipes.ingredients.noneHint')}
        </Text>
      </View>
    );
  }
  return (
    <View className="bg-card border-border overflow-hidden rounded-3xl border">
      {list.items.map((item, index) => {
        const name = ingredientName(item, language);
        const row = added.get(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => onPick(item)}
            role="button"
            aria-label={
              row
                ? `${name.primary}, ${t('food.recipes.ingredients.added')}`
                : t('food.recipes.ingredients.add', { name: name.primary })
            }
            className={cn(
              'active:bg-muted hover:bg-muted/60 flex-row items-center gap-3 px-3.5 py-3',
              index > 0 && 'border-border border-t',
            )}
          >
            <IngredientTile uri={item.image_url} />
            <View className="min-w-0 flex-1">
              <Text className="font-medium leading-5" numberOfLines={2}>
                {name.primary}
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {[
                  name.secondary,
                  item.kcal_per_100g != null
                    ? t('food.recipes.ingredients.kcal', {
                        kcal: Math.round(item.kcal_per_100g).toLocaleString(),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {row ? (
              <View className="bg-primary/10 flex-row items-center gap-1 rounded-full px-2.5 py-1">
                <Icon as={Check} size={14} className="text-primary" />
                <Text className="text-primary text-xs font-semibold">
                  {row.grams
                    ? t('food.detail.grams', { grams: row.grams.toLocaleString() })
                    : t('food.recipes.ingredients.added')}
                </Text>
              </View>
            ) : (
              <View className="bg-primary h-8 w-8 items-center justify-center rounded-full">
                <Icon as={Plus} size={16} className="text-primary-foreground" />
              </View>
            )}
          </Pressable>
        );
      })}
      {list.hasMore ? (
        <View className="border-border items-center border-t py-4">
          <ActivityIndicator className="text-muted-foreground" />
        </View>
      ) : null}
    </View>
  );
}
