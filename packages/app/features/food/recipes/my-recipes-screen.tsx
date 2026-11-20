'use client';

import type { FoodItem } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, ChefHat, Icon, Plus, Text } from '@mybela/ui';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { Skeleton } from '../../../components/skeleton';
import { tapHaptic } from '../../../lib/haptics';
import { useAppRouter } from '../../../lib/navigation';
import { useIsOnline } from '../../../lib/use-online';
import { InlineState } from '../../home/components/primitives';
import { AppTopBar } from '../../shell/top-bar';
import { FoodCard } from '../components/food-card';
import { FoodDetailSheet } from '../components/food-detail-sheet';
import { useRecentFoods } from '../queries';
import { recipeEditorHref } from './links';
import { useMyRecipes } from './queries';

const COLUMNS = 2;

/**
 * `/food/my-recipes`: every recipe the person saved, as cards, a page at a time. Tapping one opens
 * the usual detail sheet (log, edit, delete).
 */
export function MyRecipesScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const online = useIsOnline();
  const list = useMyRecipes();
  const addRecent = useRecentFoods((s) => s.add);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [open, setOpen] = useState(false);

  const create = () => {
    tapHaptic();
    router.push(recipeEditorHref());
  };
  const select = useCallback(
    (item: FoodItem) => {
      tapHaptic();
      addRecent(item);
      setSelected(item);
      setOpen(true);
    },
    [addRecent],
  );

  let empty: React.ReactElement | null = null;
  if (list.loading) {
    empty = (
      <View aria-busy className="flex-row flex-wrap">
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={{ width: `${100 / COLUMNS}%` }} className="p-1.5">
            <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
          </View>
        ))}
      </View>
    );
  } else if (list.failed) {
    empty = (
      <InlineState kind={online ? undefined : 'offline'} error={list.error} onRetry={list.retry} />
    );
  } else {
    empty = (
      <FadeIn className="items-center gap-4 px-6 py-12">
        <View className="bg-sage/20 h-20 w-20 items-center justify-center rounded-[28px]">
          <Icon as={ChefHat} size={36} strokeWidth={1.5} className="text-primary" />
        </View>
        <View className="items-center gap-1.5">
          <Text role="heading" aria-level={2} className="text-center text-lg font-bold">
            {t('food.recipes.emptyTitle')}
          </Text>
          <Text className="text-muted-foreground max-w-xs text-center leading-6">
            {t('food.recipes.emptyBody')}
          </Text>
        </View>
        <Button className="rounded-full" onPress={create}>
          <Icon as={Plus} size={16} className="text-primary-foreground" />
          <Text>{t('food.recipes.createRecipe')}</Text>
        </Button>
      </FadeIn>
    );
  }

  return (
    <View className="bg-background flex-1">
      <AppTopBar back />
      <FlatList
        numColumns={COLUMNS}
        data={list.items}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-lg px-3.5 pb-10 pt-4"
        onEndReached={list.hasMore ? list.loadMore : undefined}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          <View className="mb-3 flex-row items-end justify-between gap-3 px-1.5">
            <View className="flex-1 gap-1">
              <Text role="heading" aria-level={2} className="text-2xl font-bold tracking-tight">
                {t('food.recipes.myTitle')}
              </Text>
              <Text className="text-muted-foreground leading-6">
                {list.total > 0
                  ? t('food.recipes.count', { count: list.total })
                  : t('food.recipes.listSubtitle')}
              </Text>
            </View>
            {list.total > 0 ? (
              <Button size="sm" className="rounded-full" onPress={create}>
                <Icon as={Plus} size={16} className="text-primary-foreground" />
                <Text>{t('food.recipes.create')}</Text>
              </Button>
            ) : null}
          </View>
        }
        ListEmptyComponent={empty}
        renderItem={({ item, index }) => (
          <View style={{ width: `${100 / COLUMNS}%` }} className="p-1.5">
            <FadeIn delay={Math.min(index % 10, 8) * 30} className="flex-1">
              <FoodCard item={item} query="" onPress={select} />
            </FadeIn>
          </View>
        )}
        ListFooterComponent={
          list.hasMore ? (
            <View className="items-center py-6">
              <ActivityIndicator className="text-muted-foreground" />
            </View>
          ) : null
        }
      />
      <FoodDetailSheet item={selected} open={open} onClose={() => setOpen(false)} />
    </View>
  );
}
