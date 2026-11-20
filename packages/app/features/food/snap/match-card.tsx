'use client';

import {
  type FoodItem,
  fetchRecipe,
  isApiConfigured,
  type MealPhotoCandidate,
  mealCandidateFood,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Icon, Text } from '@mybela/ui';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FoodImage } from '../../../components/food-image';
import { useLanguage } from '../../../lib/language';
import { foodNames, kcalLabel, methodLabel } from '../display';
import { methodIcon } from '../method-icons';

/** The same key as the log form's recipe query, so a match opened for logging is already there. */
export const recipeQueryKey = (id: string) => ['food', 'recipe', id];

/**
 * A match as a food: the name and photo from the match at once, the full recipe (kcal, serving)
 * as soon as it arrives.
 */
function useMatchFood(candidate: MealPhotoCandidate): FoodItem {
  const query = useQuery({
    queryKey: recipeQueryKey(candidate.recipe_id),
    queryFn: ({ signal }) => fetchRecipe(candidate.recipe_id, signal),
    enabled: isApiConfigured(),
    staleTime: 5 * 60_000,
  });
  return query.data ?? mealCandidateFood(candidate);
}

/** The best match, big, with "Yes, log it". */
export function TopMatch({
  candidate,
  busy,
  onLog,
}: {
  candidate: MealPhotoCandidate;
  busy: boolean;
  onLog: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const item = useMatchFood(candidate);
  const { primary, secondary } = foodNames(item, language);
  const kcal = kcalLabel(t, item);

  return (
    <View className="bg-card border-border gap-4 rounded-3xl border p-3 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-3.5">
        <View className="bg-sage/15 h-24 w-24 items-center justify-center overflow-hidden rounded-2xl">
          <FoodImage
            uri={item.image_url}
            className="absolute inset-0"
            fallback={
              <Icon
                as={methodIcon(item.cooking_method)}
                size={36}
                strokeWidth={1.5}
                className="text-primary/70"
              />
            }
          />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            role="heading"
            aria-level={3}
            numberOfLines={2}
            className="text-xl font-bold leading-7"
          >
            {primary}
          </Text>
          {secondary ? (
            <Text numberOfLines={1} className="text-muted-foreground text-sm leading-5">
              {secondary}
            </Text>
          ) : null}
          <Text className="text-muted-foreground pt-1 text-xs font-semibold uppercase tracking-wider">
            {[methodLabel(t, item.cooking_method), kcal].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <Button size="lg" className="rounded-full" disabled={busy} onPress={onLog}>
        {busy ? <ActivityIndicator size="small" className="text-primary-foreground" /> : null}
        <Text>{t('food.snap.logIt')}</Text>
      </Button>
    </View>
  );
}

/** Another possible match: a small photo card; tapping it logs that dish instead. */
export function AltMatch({
  candidate,
  busy,
  disabled,
  onPress,
}: {
  candidate: MealPhotoCandidate;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const item = useMatchFood(candidate);
  const { primary, secondary } = foodNames(item, language);
  const kcal = kcalLabel(t, item);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      aria-label={[primary, secondary, kcal].filter(Boolean).join(', ')}
      className="bg-card border-border flex-1 overflow-hidden rounded-3xl border shadow-sm shadow-black/5 active:scale-[0.98]"
    >
      <View className="bg-sage/15 aspect-[4/3] w-full items-center justify-center">
        <FoodImage
          uri={item.image_url}
          className="absolute inset-0"
          fallback={
            <Icon
              as={methodIcon(item.cooking_method)}
              size={30}
              strokeWidth={1.5}
              className="text-primary/70"
            />
          }
        />
        {busy ? (
          <View className="bg-background/70 absolute inset-0 items-center justify-center">
            <ActivityIndicator className="text-primary" />
          </View>
        ) : null}
      </View>
      <View className="gap-0.5 px-3 pb-3 pt-2">
        <Text numberOfLines={2} className="text-sm font-semibold leading-5">
          {primary}
        </Text>
        {kcal ? <Text className="text-muted-foreground text-xs">{kcal}</Text> : null}
      </View>
    </Pressable>
  );
}
