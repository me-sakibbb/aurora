'use client';

import type { RecipeDetail } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Check, Icon, Text } from '@mybela/ui';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { FoodImage } from '../../../components/food-image';
import { Pop } from '../../../components/pop';
import { Sheet } from '../../../components/sheet';
import { successHaptic } from '../../../lib/haptics';
import { useInsets } from '../../../lib/insets';
import { useLanguage } from '../../../lib/language';
import { useAppRouter } from '../../../lib/navigation';
import { AppTopBar } from '../../shell/top-bar';
import { LogPanel } from '../components/log-panel';
import { foodNames, kcalLabel, methodLabel } from '../display';
import { methodIcon } from '../method-icons';

const MACROS = ['protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;

/**
 * After saving: the recipe as the backend now has it, with its nutrition per 100 g as returned.
 * "Log it now" opens the usual log form over it; "Done" goes back to where the editor was opened.
 */
export function SavedPanel({ recipe, edited }: { recipe: RecipeDetail; edited: boolean }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useInsets();
  const router = useAppRouter();
  const [logOpen, setLogOpen] = useState(false);
  const { primary, secondary } = foodNames(recipe, language);
  const kcal = kcalLabel(t, recipe);
  const nutrients = recipe.nutrients_per_100g;
  const macros = MACROS.filter((key) => nutrients?.[key] != null);

  useEffect(() => {
    successHaptic();
  }, []);

  return (
    <View className="bg-background flex-1">
      <AppTopBar back />
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-lg items-center gap-6 px-5 pb-10 pt-8"
      >
        <Pop appear>
          <View className="bg-primary h-16 w-16 items-center justify-center rounded-full">
            <Icon as={Check} size={32} strokeWidth={2.5} className="text-primary-foreground" />
          </View>
        </Pop>
        <FadeIn delay={80} className="items-center gap-1.5">
          <Text role="heading" aria-level={2} className="text-center text-2xl font-bold">
            {edited ? t('food.recipes.saved.titleEdit') : t('food.recipes.saved.title')}
          </Text>
          <Text className="text-muted-foreground max-w-xs text-center leading-6">
            {t('food.recipes.saved.body')}
          </Text>
        </FadeIn>

        <FadeIn
          delay={160}
          className="bg-card border-border w-full overflow-hidden rounded-3xl border shadow-sm shadow-black/5"
        >
          <View className="bg-sage/15 aspect-[4/3] w-full items-center justify-center">
            <FoodImage
              uri={recipe.image_url}
              className="absolute inset-0"
              fallback={
                <Icon
                  as={methodIcon(recipe.cooking_method)}
                  size={56}
                  strokeWidth={1.25}
                  className="text-primary/80"
                />
              }
            />
            {kcal ? (
              <View className="bg-card/95 absolute bottom-3 left-3 rounded-full px-3 py-1 shadow-sm shadow-black/10">
                <Text className="text-xs font-semibold">{kcal}</Text>
              </View>
            ) : null}
          </View>
          <View className="gap-4 p-5">
            <View className="gap-0.5">
              <Text className="text-xl font-bold leading-7">{primary}</Text>
              {secondary ? <Text className="text-muted-foreground">{secondary}</Text> : null}
              <Text className="text-muted-foreground pt-1 text-[11px] font-semibold uppercase tracking-wider">
                {methodLabel(t, recipe.cooking_method)}
              </Text>
            </View>
            {macros.length > 0 ? (
              <View className="gap-2">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t('food.recipes.saved.per100g')}
                </Text>
                <View className="flex-row gap-2">
                  {macros.map((key) => (
                    <View
                      key={key}
                      className="bg-background flex-1 items-center gap-0.5 rounded-2xl py-3"
                    >
                      <Text className="text-base font-bold">
                        {t('food.detail.grams', { grams: nutrients?.[key]?.toLocaleString() })}
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {t(`food.detail.${key}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </FadeIn>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="bg-background border-border border-t px-5 pt-3"
      >
        <View className="mx-auto w-full max-w-lg flex-row gap-3">
          <Button variant="outline" size="lg" className="rounded-full px-6" onPress={router.back}>
            <Text>{t('food.recipes.saved.done')}</Text>
          </Button>
          <Button size="lg" className="flex-1 rounded-full" onPress={() => setLogOpen(true)}>
            <Text>{t('food.recipes.saved.logNow')}</Text>
          </Button>
        </View>
      </View>

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} label={primary} flush>
        <LogPanel
          item={recipe}
          onBack={() => setLogOpen(false)}
          onDone={() => {
            setLogOpen(false);
            router.back();
          }}
        />
      </Sheet>
    </View>
  );
}
