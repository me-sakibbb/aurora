'use client';

import { fetchSampleRecipes, MAX_SAMPLE_MEALS, type SampleRecipe, servingGrams } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Button,
  Carrot,
  Check,
  cn,
  Drumstick,
  Icon,
  type IconComponent,
  Plus,
  Soup,
  Text,
  UtensilsCrossed,
  Wheat,
} from '@aurora/ui';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { useLanguage } from '../../../lib/language';
import { useIsOnline } from '../../../lib/use-online';
import { FormMessage } from '../../auth/components/form';
import { StepHeading } from '../components/layout';
import type { StepDefinition, StepProps } from './types';

// Display only: a picture for each cooking method until recipes have photos.
const METHOD_ICONS: Record<string, IconComponent> = {
  dal: Soup,
  curry: Drumstick,
  bhat: Wheat,
  torkari: Carrot,
};
const mealIcon = (recipe: SampleRecipe) =>
  (recipe.cooking_method && METHOD_ICONS[recipe.cooking_method]) || UtensilsCrossed;

export const sampleRecipesQueryKey = ['food', 'recipes', 'samples'];

function useSampleRecipes() {
  return useQuery({
    queryKey: sampleRecipesQueryKey,
    queryFn: fetchSampleRecipes,
    staleTime: 60 * 60_000,
  });
}

/**
 * Calorie sandbox (not a question): try logging one or two meals from a preloaded carousel.
 * Meals come from the backend; no numbers are worked out here (calories are backend-owned).
 */
export const sandboxStep: StepDefinition = {
  Body: function SandboxBody({ draft, update }) {
    const { t } = useTranslation();
    const { language } = useLanguage();
    const online = useIsOnline();
    const recipes = useSampleRecipes();
    // Wide screens: a grid (a sideways carousel is awkward with a mouse). Phones: swipeable row.
    const grid = useWindowDimensions().width >= 1024;

    const selected = draft.sampleMeals.map((meal) => meal.recipeId);
    const full = selected.length >= MAX_SAMPLE_MEALS;
    const toggle = (recipe: SampleRecipe) => {
      if (selected.includes(recipe.id)) {
        update({ sampleMeals: draft.sampleMeals.filter((meal) => meal.recipeId !== recipe.id) });
      } else if (!full) {
        update({
          sampleMeals: [...draft.sampleMeals, { recipeId: recipe.id, grams: servingGrams(recipe) }],
        });
      }
    };
    const name = (recipe: SampleRecipe) =>
      language === 'bn' && recipe.name_bn ? recipe.name_bn : recipe.name;

    let content: React.ReactNode;
    if (recipes.data === undefined && recipes.isPending) {
      content = (
        <View className="flex-row gap-3 overflow-hidden" aria-label={t('common.loading')} aria-busy>
          {[0, 1, 2].map((i) => (
            <View key={i} className="bg-muted/70 h-56 w-40 rounded-2xl" />
          ))}
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator className="text-muted-foreground" />
          </View>
        </View>
      );
    } else if (recipes.data === undefined) {
      content = (
        <FormMessage
          tone={online ? 'error' : 'offline'}
          action={{ label: t('common.retry'), onPress: () => void recipes.refetch() }}
        >
          {online ? t('onboarding.sandbox.error') : t('onboarding.sandbox.offline')}
        </FormMessage>
      );
    } else if (recipes.data.length === 0) {
      content = <FormMessage tone="info">{t('onboarding.sandbox.empty')}</FormMessage>;
    } else {
      const added = recipes.data.filter((r) => selected.includes(r.id));
      content = (
        <View className="gap-6">
          <Carousel grid={grid}>
            {recipes.data.map((recipe) => {
              const isSelected = selected.includes(recipe.id);
              const disabled = full && !isSelected;
              return (
                <Pressable
                  key={recipe.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={name(recipe)}
                  disabled={disabled}
                  onPress={() => toggle(recipe)}
                  className={cn(
                    'bg-card gap-3 rounded-2xl border-2 p-3 shadow-sm shadow-black/5 active:scale-[0.98]',
                    grid ? 'w-[48.5%]' : 'w-40',
                    isSelected ? 'border-primary' : 'border-border',
                    disabled && 'opacity-45',
                  )}
                >
                  {/* Recipes have no photos yet: an icon per cooking method. */}
                  <View
                    aria-hidden
                    className={cn(
                      'h-24 items-center justify-center rounded-xl',
                      isSelected ? 'bg-primary' : 'bg-sage/15',
                    )}
                  >
                    <Icon
                      as={mealIcon(recipe)}
                      size={36}
                      strokeWidth={1.75}
                      className={isSelected ? 'text-primary-foreground' : 'text-primary'}
                    />
                    {isSelected ? (
                      <View className="bg-card absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full">
                        <Icon as={Check} size={14} strokeWidth={3} className="text-primary" />
                      </View>
                    ) : null}
                  </View>
                  <View className="gap-0.5">
                    <Text className="text-base font-semibold" numberOfLines={2}>
                      {name(recipe)}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {t('onboarding.sandbox.portion', { grams: servingGrams(recipe) })}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'h-9 flex-row items-center justify-center gap-1.5 rounded-full',
                      isSelected ? 'bg-secondary/40' : 'bg-muted',
                    )}
                  >
                    <Icon as={isSelected ? Check : Plus} size={15} strokeWidth={2.5} />
                    <Text className="text-sm font-semibold">
                      {isSelected ? t('onboarding.sandbox.added') : t('onboarding.sandbox.add')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Carousel>

          <View className="bg-card border-border gap-3 rounded-2xl border border-dashed p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold">{t('onboarding.sandbox.plate')}</Text>
              <Text className="text-muted-foreground text-sm">
                {t('onboarding.sandbox.count', { count: added.length, max: MAX_SAMPLE_MEALS })}
              </Text>
            </View>
            {added.length === 0 ? (
              <View className="flex-row items-center gap-3 py-2">
                <Icon as={UtensilsCrossed} size={18} className="text-muted-foreground" />
                <Text className="text-muted-foreground text-sm">
                  {t('onboarding.sandbox.plateEmpty')}
                </Text>
              </View>
            ) : (
              added.map((recipe) => (
                <FadeIn key={recipe.id}>
                  <View className="bg-background flex-row items-center gap-3 rounded-xl p-2.5">
                    <View className="bg-sage/15 h-9 w-9 items-center justify-center rounded-lg">
                      <Icon as={mealIcon(recipe)} size={18} className="text-primary" />
                    </View>
                    <Text className="flex-1 text-base font-medium">{name(recipe)}</Text>
                    <Pressable
                      role="button"
                      aria-label={t('onboarding.sandbox.removeLabel', { name: name(recipe) })}
                      onPress={() => toggle(recipe)}
                      hitSlop={8}
                      className="h-9 justify-center px-2 active:opacity-60"
                    >
                      <Text className="text-muted-foreground text-sm font-medium">
                        {t('onboarding.sandbox.remove')}
                      </Text>
                    </Pressable>
                  </View>
                </FadeIn>
              ))
            )}
          </View>
        </View>
      );
    }

    return (
      <>
        <StepHeading
          title={t('onboarding.sandbox.title')}
          subtitle={t('onboarding.sandbox.subtitle', { count: MAX_SAMPLE_MEALS })}
        />
        {content}
      </>
    );
  },
  Footer: SandboxFooter,
};

function Carousel({ grid, children }: { grid: boolean; children: React.ReactNode }) {
  if (grid) return <View className="flex-row flex-wrap justify-between gap-y-3">{children}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 py-1 pr-1"
    >
      {children}
    </ScrollView>
  );
}

/** Continue once a meal is added. If the meals can't load, people can still move on. */
function SandboxFooter({ draft, next }: StepProps) {
  const { t } = useTranslation();
  const recipes = useSampleRecipes();
  const unavailable = recipes.data?.length === 0 || (recipes.data === undefined && recipes.isError);
  if (unavailable) {
    return (
      <Button size="lg" onPress={next}>
        <Text>{t('onboarding.skip')}</Text>
      </Button>
    );
  }
  return (
    <Button size="lg" onPress={next} disabled={draft.sampleMeals.length === 0}>
      <Text>{t('onboarding.continue')}</Text>
    </Button>
  );
}
