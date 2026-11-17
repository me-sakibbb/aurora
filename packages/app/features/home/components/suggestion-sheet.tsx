'use client';

import { fetchRecipe, isApiConfigured, type MealSuggestion } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { BadgeCheck, Button, cn, Icon, Info, Sparkles, Text, X } from '@mybela/ui';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FoodImage } from '../../../components/food-image';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useAppDimensions } from '../../../lib/dimensions';
import { useInsets } from '../../../lib/insets';
import { useLanguage } from '../../../lib/language';
import { LogPanel } from '../../food/components/log-panel';
import { foodNames } from '../../food/display';
import { methodIcon } from '../../food/method-icons';
import { InlineState, MEAL_ICONS, SLOT_TONE } from './primitives';

/**
 * One suggestion up close (F18): the photo, the portion and calories as returned, the backend's
 * full explanation, and the honest note that a nutrition figure describes the food, not the
 * person. "Log this meal" turns the sheet into the usual F6 log form, set to the suggested meal.
 */
export function SuggestionSheet({
  item,
  open,
  onClose,
}: {
  item: MealSuggestion | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useInsets();
  const { width, height } = useAppDimensions();
  const [mode, setMode] = useState<'detail' | 'log'>('detail');
  const recipeId = item?.recipes?.id ?? item?.recipe_id ?? null;

  useEffect(() => {
    if (open) setMode('detail');
  }, [open]);

  // The full recipe (with its logging questions) is only needed once they choose to log it.
  const recipe = useQuery({
    queryKey: ['food', 'recipe', recipeId],
    queryFn: ({ signal }) => fetchRecipe(recipeId as string, signal),
    enabled: mode === 'log' && Boolean(recipeId) && isApiConfigured(),
    staleTime: 5 * 60_000,
  });

  if (!item) return null;

  const names = item.recipes
    ? foodNames(item.recipes, language)
    : { primary: t('home.suggestions.unnamed'), secondary: null };
  const heroHeight = Math.min(Math.round(width * 0.68), height * 0.36);

  return (
    <Sheet open={open} onClose={onClose} label={names.primary} flush>
      {mode === 'log' ? (
        recipe.data ? (
          <LogPanel
            key={recipe.data.id}
            item={recipe.data}
            initialSlot={item.meal_slot === 'snack' ? 'snacks' : item.meal_slot}
            onBack={() => setMode('detail')}
            onDone={onClose}
          />
        ) : (
          <View className="min-h-[280px] items-center justify-center px-5 py-10">
            {recipe.isError ? (
              <InlineState error={recipe.error} onRetry={() => recipe.refetch()} />
            ) : (
              <ActivityIndicator />
            )}
          </View>
        )
      ) : (
        <SheetScrollView
          style={{ maxHeight: height * 0.92 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{ height: heroHeight }}
            className={cn(
              'w-full items-center justify-center overflow-hidden',
              SLOT_TONE[item.meal_slot],
            )}
          >
            <FoodImage
              uri={item.recipes?.image_url}
              className="absolute inset-0"
              fallback={
                <View
                  aria-hidden
                  className="bg-card/60 h-32 w-32 items-center justify-center rounded-full"
                >
                  <Icon
                    as={
                      item.recipes?.cooking_method
                        ? methodIcon(item.recipes.cooking_method)
                        : MEAL_ICONS[item.meal_slot]
                    }
                    size={64}
                    strokeWidth={1.25}
                    className="text-primary/80"
                  />
                </View>
              }
            />
            <View className="absolute bottom-3 left-4 flex-row gap-2">
              <View className="bg-card/95 rounded-full px-3 py-1 shadow-sm shadow-black/10">
                <Text className="text-xs font-semibold">{t(`home.meals.${item.meal_slot}`)}</Text>
              </View>
              {item.tried ? (
                <View className="bg-primary flex-row items-center gap-1 rounded-full px-3 py-1">
                  <Icon as={BadgeCheck} size={13} className="text-primary-foreground" />
                  <Text className="text-primary-foreground text-xs font-semibold">
                    {t('home.suggestions.tried')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="gap-5 px-5 pt-5">
            <View className="gap-1">
              <Text
                role="heading"
                aria-level={2}
                className="text-2xl font-bold leading-8 tracking-tight"
              >
                {names.primary}
              </Text>
              {names.secondary ? (
                <Text className="text-muted-foreground text-base leading-6">{names.secondary}</Text>
              ) : null}
            </View>

            <View className="flex-row gap-3">
              <Stat
                label={t('home.suggestions.calories')}
                value={t('home.suggestions.kcal', { kcal: Math.round(item.kcal).toLocaleString() })}
              />
              <Stat
                label={t('home.suggestions.amount')}
                value={t('food.detail.grams', { grams: Math.round(item.grams).toLocaleString() })}
              />
            </View>

            {item.reason ? (
              <View className="bg-sage/10 border-sage/30 gap-2 rounded-2xl border p-4">
                <View className="flex-row items-center gap-2">
                  <Icon as={Sparkles} size={16} className="text-olive" />
                  <Text className="text-xs font-semibold uppercase tracking-wider">
                    {t('home.suggestions.why')}
                  </Text>
                </View>
                <Text className="leading-6">{item.reason}</Text>
              </View>
            ) : null}

            <View className="flex-row gap-2.5 px-1">
              <Icon as={Info} size={16} className="text-muted-foreground mt-0.5" />
              <Text className="text-muted-foreground flex-1 text-sm leading-5">
                {item.note ?? t('home.suggestions.note')}
              </Text>
            </View>

            {recipeId ? (
              <Button size="lg" className="rounded-full" onPress={() => setMode('log')}>
                <Text>{t('food.detail.log')}</Text>
              </Button>
            ) : null}
          </View>
        </SheetScrollView>
      )}
      <Pressable
        onPress={onClose}
        role="button"
        aria-label={t('food.detail.back')}
        hitSlop={8}
        className="bg-card/95 absolute right-3 top-3 z-10 h-10 w-10 items-center justify-center rounded-full shadow-sm shadow-black/10 active:opacity-80"
      >
        <Icon as={X} size={20} className="text-foreground" />
      </Pressable>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-background flex-1 gap-1 rounded-2xl p-3.5">
      <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {label}
      </Text>
      <Text className="text-lg font-bold">{value}</Text>
    </View>
  );
}
