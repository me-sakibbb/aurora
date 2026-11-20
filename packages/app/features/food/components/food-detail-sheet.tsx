'use client';

import { type FoodItem, servingGrams } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, ChefHat, Icon, Pencil, Text, Trash2, X } from '@mybela/ui';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FoodImage } from '../../../components/food-image';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useAppDimensions } from '../../../lib/dimensions';
import { useInsets } from '../../../lib/insets';
import { useLanguage } from '../../../lib/language';
import { useAppRouter } from '../../../lib/navigation';
import { foodNames, kcalLabel, methodLabel } from '../display';
import { methodIcon } from '../method-icons';
import { DeleteRecipeConfirm } from '../recipes/components/delete-recipe-confirm';
import { recipeEditorHref } from '../recipes/links';
import { LogPanel } from './log-panel';

const MACROS = ['protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;

/**
 * A closer look at one food: a big photo up top (a large cooking-method illustration until photos
 * exist), both names, the typical serving and the backend's nutrition per 100 g, as returned.
 * Scrolls when it's taller than the screen. "Log this meal" turns the same sheet into the F6
 * log form (`LogPanel`). The person's own recipes (A2) can also be edited or deleted from here.
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
  const { width, height } = useAppDimensions();
  const router = useAppRouter();
  const [mode, setMode] = useState<'detail' | 'log'>('detail');
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Every newly opened food starts on its details.
  const itemId = item?.id;
  useEffect(() => {
    if (open && itemId) {
      setMode('detail');
      setConfirmDelete(false);
    }
  }, [open, itemId]);
  if (!item) return null;

  const { primary, secondary } = foodNames(item, language);
  const kcal = kcalLabel(t, item);
  const nutrients = item.nutrients_per_100g;
  const macros = MACROS.filter((key) => nutrients?.[key] != null);
  // A landscape hero, capped so the name and figures still show without scrolling.
  const heroHeight = Math.min(Math.round(width * 0.75), height * 0.42);

  return (
    <Sheet open={open} onClose={onClose} label={primary} flush>
      {mode === 'log' ? (
        // Keyed by food so a new one never inherits the last one's portion or answers.
        <LogPanel key={item.id} item={item} onBack={() => setMode('detail')} onDone={onClose} />
      ) : (
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
            <View className="absolute bottom-3 left-4 flex-row gap-2">
              <View className="bg-card/95 rounded-full px-3 py-1 shadow-sm shadow-black/10">
                <Text className="text-xs font-semibold">{methodLabel(t, item.cooking_method)}</Text>
              </View>
              {item.is_custom ? (
                <View className="bg-primary flex-row items-center gap-1 rounded-full px-3 py-1">
                  <Icon as={ChefHat} size={12} className="text-primary-foreground" />
                  <Text className="text-primary-foreground text-xs font-semibold">
                    {t('food.recipes.mine')}
                  </Text>
                </View>
              ) : null}
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
                      <Text className="text-muted-foreground text-xs">
                        {t(`food.detail.${key}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Button size="lg" className="rounded-full" onPress={() => setMode('log')}>
              <Text>{t('food.detail.log')}</Text>
            </Button>

            {item.is_custom ? (
              confirmDelete ? (
                <DeleteRecipeConfirm
                  id={item.id}
                  name={primary}
                  onCancel={() => setConfirmDelete(false)}
                  onDeleted={onClose}
                />
              ) : (
                <View className="-mt-2 flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    onPress={() => {
                      onClose();
                      router.push(recipeEditorHref(item.id));
                    }}
                  >
                    <Icon as={Pencil} size={16} className="text-foreground" />
                    <Text>{t('food.recipes.detail.edit')}</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 rounded-full"
                    onPress={() => setConfirmDelete(true)}
                  >
                    <Icon as={Trash2} size={16} className="text-destructive" />
                    <Text className="text-destructive">{t('food.recipes.detail.delete')}</Text>
                  </Button>
                </View>
              )
            ) : null}
          </View>
        </SheetScrollView>
      )}
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
