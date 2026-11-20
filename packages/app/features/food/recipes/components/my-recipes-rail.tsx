'use client';

import type { FoodItem } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Icon, Text } from '@mybela/ui';
import { Pressable, ScrollView, View } from 'react-native';
import { FadeIn } from '../../../../components/fade-in';
import { FoodImage } from '../../../../components/food-image';
import { useLanguage } from '../../../../lib/language';
import { useAppRouter } from '../../../../lib/navigation';
import { foodNames } from '../../display';
import { methodIcon } from '../../method-icons';
import { MY_RECIPES_HREF } from '../links';
import { useMyRecipes } from '../queries';

/** Tiles in the rail before "See all" takes over. */
const RAIL_LIMIT = 10;

/**
 * The Food tab's "My recipes" row: the person's recipes as photo tiles, with "See all". Shown
 * only once they have at least one; creating one starts from "+ New recipe" by the dish grid.
 */
export function MyRecipesRail({ onPick }: { onPick: (item: FoodItem) => void }) {
  const { t } = useTranslation();
  const router = useAppRouter();
  const list = useMyRecipes();
  if (list.loading || list.failed || list.total === 0) return null;

  return (
    <FadeIn delay={30}>
      <View className="mb-3 flex-row items-center justify-between px-1.5">
        <Text role="heading" aria-level={2} className="text-[17px] font-bold tracking-tight">
          {t('food.recipes.myTitle')}
        </Text>
        <Pressable
          onPress={() => router.push(MY_RECIPES_HREF)}
          hitSlop={8}
          className="active:opacity-60"
        >
          <Text className="text-muted-foreground text-sm font-semibold">
            {t('food.recipes.seeAll')}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 px-1.5"
      >
        {list.items.slice(0, RAIL_LIMIT).map((item) => (
          <RecipeTile key={item.id} item={item} onPress={() => onPick(item)} />
        ))}
      </ScrollView>
    </FadeIn>
  );
}

function RecipeTile({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  const { language } = useLanguage();
  const name = foodNames(item, language).primary;
  return (
    <Pressable
      onPress={onPress}
      aria-label={name}
      className="w-[76px] items-center gap-1.5 active:opacity-80"
    >
      <View className="bg-sage/15 border-border h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-2xl border">
        <FoodImage
          uri={item.image_url}
          className="absolute inset-0"
          fallback={
            <Icon as={methodIcon(item.cooking_method)} size={26} className="text-primary/70" />
          }
        />
      </View>
      <Text numberOfLines={2} className="text-center text-xs font-medium leading-4">
        {name}
      </Text>
    </Pressable>
  );
}
