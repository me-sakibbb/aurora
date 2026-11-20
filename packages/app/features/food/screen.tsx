'use client';

import type { FoodItem } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Text } from '@mybela/ui';
import { useCallback, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { FoodDetailSheet } from './components/food-detail-sheet';
import { FoodSearch } from './food-search';
import { useFoodLogWrites } from './log-queries';
import { useRecentFoods } from './queries';
import { SnapButton } from './snap/snap-button';
import { SnapSheet } from './snap/snap-sheet';

/**
 * The Food tab: F5 Food Search. Picking a food opens its details (remembered under "Recent"),
 * where it can be logged (F6). The day view (F7) builds on this screen.
 */
export function FoodScreen() {
  const { t } = useTranslation();
  const addRecent = useRecentFoods((s) => s.add);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [open, setOpen] = useState(false);
  const writes = useFoodLogWrites();
  const [snapOpen, setSnapOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const onSelect = useCallback(
    (item: FoodItem) => {
      addRecent(item);
      setSelected(item);
      setOpen(true);
    },
    [addRecent],
  );

  return (
    <View className="bg-background flex-1" style={{ paddingTop: 16 }}>
      {writes.failed > 0 ? (
        <FadeIn className="bg-destructive/10 mx-4 mb-3 gap-3 rounded-2xl px-4 py-3">
          <Text className="text-destructive" role="alert">
            {t('food.log.failedBanner', { count: writes.failed })}
          </Text>
          <View className="flex-row gap-2">
            <Button size="sm" className="rounded-full" onPress={writes.retry}>
              <Text>{t('common.retry')}</Text>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onPress={writes.dismiss}>
              <Text>{t('food.log.discard')}</Text>
            </Button>
          </View>
        </FadeIn>
      ) : writes.waiting > 0 ? (
        <Text className="text-muted-foreground mx-4 mb-3 text-sm">
          {t('food.log.waitingBanner', { count: writes.waiting })}
        </Text>
      ) : null}
      <FoodSearch
        onSelect={onSelect}
        inputRef={searchRef}
        searchAction={<SnapButton onPress={() => setSnapOpen(true)} />}
        header={
          // Phones skip the subtitle so more of the grid fits under the pinned search box.
          <Text className="text-muted-foreground hidden pb-1 leading-6">{t('food.subtitle')}</Text>
        }
      />
      <FoodDetailSheet item={selected} open={open} onClose={() => setOpen(false)} />
      <SnapSheet
        open={snapOpen}
        onClose={() => setSnapOpen(false)}
        onSearchInstead={() => {
          setSnapOpen(false);
          // After the sheet's closing animation, so the keyboard doesn't fight it.
          setTimeout(() => searchRef.current?.focus(), 350);
        }}
      />
    </View>
  );
}
