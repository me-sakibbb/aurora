'use client';

import { type FoodItem, servingGrams } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Icon, Info, Text, X } from '@aurora/ui';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { FoodImage } from '../../../components/food-image';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useInsets } from '../../../lib/insets';
import { useLanguage } from '../../../lib/language';
import { foodNames, kcalLabel, methodLabel } from '../display';
import { methodIcon } from '../method-icons';

const MACROS = ['protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;

/** The dialog's width on wide screens (`lg:max-w-lg`). */
const DIALOG_WIDTH = 512;

/**
 * A closer look at one food: a big photo up top (a large cooking-method illustration until photos
 * exist), both names, the typical serving and the backend's nutrition per 100 g, as returned.
 * Scrolls when it's taller than the screen. Logging it (F6) plugs in here later.
 */
export function FoodDetailSheet({
  item,
  open,
  onClose,
}: {
  /** Kept while closing so the content doesn't vanish mid-animation. */
  item: FoodItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useInsets();
  const { width, height } = useWindowDimensions();
  if (!item) return null;

  const { primary, secondary } = foodNames(item, language);
  const kcal = kcalLabel(t, item);
  const nutrients = item.nutrients_per_100g;
  const macros = MACROS.filter((key) => nutrients?.[key] != null);
  // A landscape hero, capped so the name and figures still show without scrolling.
  const heroHeight = Math.min(Math.round(Math.min(width, DIALOG_WIDTH) * 0.75), height * 0.42);

  return (
    <Sheet open={open} onClose={onClose} label={primary} flush className="lg:max-w-lg">
      <SheetScrollView
        style={{ maxHeight: height * 0.92 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ height: heroHeight }}
          className="bg-sage/20 w-full items-center justify-center overflow-hidden"
        >
          <FoodImage
            uri={item.image_url}
            className="absolute inset-0"
            fallback={
              <View
                aria-hidden
                className="bg-card/60 h-36 w-36 items-center justify-center rounded-full"
              >
                <Icon
                  as={methodIcon(item.cooking_method)}
                  size={72}
                  strokeWidth={1.25}
                  className="text-primary/80"
                />
              </View>
            }
          />
          <View className="bg-card/95 absolute bottom-3 left-4 rounded-full px-3 py-1 shadow-sm shadow-black/10">
            <Text className="text-xs font-semibold">{methodLabel(t, item.cooking_method)}</Text>
          </View>
        </View>

        <View className="gap-6 px-5 pt-5">
          <View className="gap-1">
            <Text
              role="heading"
              aria-level={2}
              className="text-2xl font-bold leading-8 tracking-tight"
            >
              {primary}
            </Text>
            {secondary ? (
              <Text className="text-muted-foreground text-base leading-6">{secondary}</Text>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            <Stat label={t('food.detail.calories')} value={kcal ?? t('food.detail.unknown')} />
            <Stat
              label={t('food.detail.serving')}
              value={t('food.detail.grams', { grams: servingGrams(item).toLocaleString() })}
            />
          </View>

          {macros.length > 0 ? (
            <View className="gap-2.5">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t('food.detail.per100g')}
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
                    <Text className="text-muted-foreground text-xs">{t(`food.detail.${key}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="bg-sage/10 flex-row items-start gap-2.5 rounded-2xl p-3.5">
            <Icon as={Info} size={16} className="text-muted-foreground mt-0.5" />
            <Text className="text-muted-foreground flex-1 text-sm leading-5">
              {t('food.detail.loggingSoon')}
            </Text>
          </View>
        </View>
      </SheetScrollView>
      {/* Outside the scroll view so it stays put while the content scrolls. */}
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
