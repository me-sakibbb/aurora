'use client';

import type { MealSuggestion, MealSuggestions } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { BadgeCheck, cn, Icon, RefreshCw, Sparkles, Text } from '@mybela/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { FoodImage } from '../../../components/food-image';
import { Skeleton } from '../../../components/skeleton';
import { useLanguage } from '../../../lib/language';
import { foodNames } from '../../food/display';
import type { SectionState } from '../queries';
import { InlineState, MEAL_ICONS, SectionHeader, SLOT_TONE } from './primitives';
import { SuggestionSheet } from './suggestion-sheet';

cssInterop(Animated.View, { className: 'style' });

const CARD_WIDTH = 232;

/** A spinning refresh icon while new ideas are on their way. */
function RefreshIcon({ spinning }: { spinning: boolean }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [spinning, value]);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    >
      <Icon as={RefreshCw} size={14} className="text-muted-foreground" />
    </Animated.View>
  );
}

function SuggestionCard({
  item,
  index,
  onPress,
}: {
  item: MealSuggestion;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const name = item.recipes
    ? foodNames(item.recipes, language).primary
    : t('home.suggestions.unnamed');

  return (
    <FadeIn delay={index * 70} from="right">
      <Pressable
        onPress={onPress}
        role="button"
        aria-label={t('home.suggestions.open', { name })}
        style={{ width: CARD_WIDTH }}
        className={cn(
          'bg-card border-border active:bg-muted overflow-hidden rounded-3xl border shadow-sm shadow-black/5',
          Platform.select({ web: 'transition-colors hover:bg-muted' }),
        )}
      >
        <View className={cn('h-32 items-center justify-center', SLOT_TONE[item.meal_slot])}>
          <FoodImage
            uri={item.recipes?.image_url}
            className="absolute inset-0"
            fallback={
              <Icon
                as={MEAL_ICONS[item.meal_slot]}
                size={38}
                strokeWidth={1.5}
                className="text-olive"
              />
            }
          />
          <View className="bg-card/95 absolute left-3 top-3 rounded-full px-2.5 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wider">
              {t(`home.meals.${item.meal_slot}`)}
            </Text>
          </View>
          {item.tried ? (
            <View className="bg-primary absolute right-3 top-3 flex-row items-center gap-1 rounded-full px-2 py-1">
              <Icon as={BadgeCheck} size={12} className="text-primary-foreground" />
              <Text className="text-primary-foreground text-[11px] font-semibold">
                {t('home.suggestions.tried')}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="gap-1.5 p-4">
          <Text numberOfLines={2} className="min-h-[44px] font-semibold leading-[22px]">
            {name}
          </Text>
          <Text variant="muted">
            {t('home.suggestions.portion', {
              kcal: Math.round(item.kcal).toLocaleString(),
              grams: Math.round(item.grams).toLocaleString(),
            })}
          </Text>
          {item.reason ? (
            <View className="mt-1 flex-row items-start gap-1.5">
              <Icon as={Sparkles} size={13} className="text-accent mt-[3px]" />
              <Text
                numberOfLines={2}
                className="text-muted-foreground flex-1 text-xs leading-[18px]"
              >
                {item.reason}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </FadeIn>
  );
}

/**
 * F18 goal-based suggestions for today: a swipeable row of photo cards. Tapping one opens it with
 * the backend's full explanation and a way to log it. Figures and wording are shown as returned.
 */
export function SuggestionsSection({
  data,
  noProfile,
  notReady,
  state,
  onRetry,
  onRegenerate,
  regenerating,
  regenerateFailed,
}: {
  data: MealSuggestions | undefined;
  /** The backend has no profile (so no target) to plan suggestions around. */
  noProfile: boolean;
  /** The backend can't plan yet (no target, or too few recipes fit): the early-days state. */
  notReady: boolean;
  state: SectionState;
  onRetry: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  regenerateFailed: boolean;
}) {
  const { t } = useTranslation();
  const items = data?.suggestions ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Kept while the sheet closes, so its content doesn't vanish mid-animation.
  const [shown, setShown] = useState<MealSuggestion | null>(null);

  const open = (index: number) => {
    setShown(items[index] ?? null);
    setOpenIndex(index);
  };

  let body: React.ReactNode;
  if (data && items.length > 0) {
    body = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleed to the screen edge on phones so the next card peeks in (a swipe hint).
        className="-mx-5"
        contentContainerClassName="gap-3 px-5"
        snapToInterval={Platform.OS === 'web' ? undefined : CARD_WIDTH + 12}
        decelerationRate="fast"
        style={regenerating ? { opacity: 0.55 } : undefined}
      >
        {items.map((item, index) => (
          <SuggestionCard
            key={item.id ?? `${item.meal_slot}-${index}`}
            item={item}
            index={index}
            onPress={() => open(index)}
          />
        ))}
      </ScrollView>
    );
  } else if (data || noProfile || notReady) {
    const key = noProfile ? 'noProfile' : notReady ? 'notReady' : 'empty';
    body = (
      <View className="bg-card border-border flex-row gap-4 rounded-3xl border border-dashed p-5">
        <View className="bg-sage/15 h-11 w-11 items-center justify-center rounded-2xl">
          <Icon as={Sparkles} size={20} className="text-olive" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold">{t(`home.suggestions.${key}Title`)}</Text>
          <Text variant="muted" className="leading-5">
            {t(`home.suggestions.${key}Body`)}
          </Text>
        </View>
      </View>
    );
  } else if (state === 'loading') {
    body = (
      <View className="flex-row gap-3" aria-busy>
        <Skeleton className="h-60 w-56 rounded-3xl" />
        <Skeleton className="h-60 w-56 rounded-3xl" />
      </View>
    );
  } else {
    body = <InlineState kind={state === 'offline' ? 'offline' : 'error'} onRetry={onRetry} />;
  }

  const canRegenerate = Boolean(data && items.length > 0);

  return (
    <View>
      <SectionHeader
        title={t('home.suggestions.title')}
        trailing={
          canRegenerate ? (
            <Pressable
              onPress={onRegenerate}
              disabled={regenerating}
              role="button"
              aria-label={t('home.suggestions.regenerate')}
              className="-mr-1 flex-row items-center gap-1.5 rounded-full px-2 py-1 active:opacity-60"
            >
              <RefreshIcon spinning={regenerating} />
              <Text className="text-muted-foreground text-sm font-semibold">
                {t('home.suggestions.regenerate')}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {regenerateFailed ? (
        <Text className="text-destructive mb-2 px-1 text-sm" role="alert">
          {t('home.suggestions.regenerateFailed')}
        </Text>
      ) : null}
      {body}
      <SuggestionSheet item={shown} open={openIndex !== null} onClose={() => setOpenIndex(null)} />
    </View>
  );
}
