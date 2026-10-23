'use client';

import type { FoodItem } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Text } from '@aurora/ui';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useInsets } from '../../lib/insets';
import { FoodDetailSheet } from './components/food-detail-sheet';
import { FoodSearch } from './food-search';
import { useRecentFoods } from './queries';

/**
 * The Food tab. For now it's F5 Food Search: picking a food opens its details and remembers it
 * under "Recent". Logging (F6) and the day view (F7) build on this screen.
 */
export function FoodScreen() {
  const { t } = useTranslation();
  const insets = useInsets();
  const addRecent = useRecentFoods((s) => s.add);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [open, setOpen] = useState(false);

  const onSelect = useCallback(
    (item: FoodItem) => {
      addRecent(item);
      setSelected(item);
      setOpen(true);
    },
    [addRecent],
  );

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top + 16 }}>
      <FoodSearch
        onSelect={onSelect}
        header={
          <View className="gap-1 pb-1 lg:pt-6">
            <Text
              role="heading"
              aria-level={1}
              className="text-[28px] font-bold leading-9 tracking-tight lg:text-4xl lg:leading-[44px]"
            >
              {t('food.title')}
            </Text>
            {/* Phones skip the subtitle so more of the grid fits under the pinned search box. */}
            <Text className="text-muted-foreground hidden leading-6 sm:flex">
              {t('food.subtitle')}
            </Text>
          </View>
        }
      />
      <FoodDetailSheet item={selected} open={open} onClose={() => setOpen(false)} />
    </View>
  );
}
