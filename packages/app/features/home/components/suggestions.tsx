'use client';

import type { MealSuggestions } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { cn, Icon, Text } from '@aurora/ui';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { Skeleton } from '../../../components/skeleton';
import type { WithSource } from '../queries';
import { InlineState, MEAL_ICONS, PreviewBadge, SectionHeader } from './primitives';

const SLOT_TONE = {
  breakfast: 'bg-taupe/35',
  lunch: 'bg-sage/20',
  snack: 'bg-muted',
  dinner: 'bg-primary/10',
} as const;

/** F18 goal-based suggestions for today: a swipeable row of meal cards, explained as returned. */
export function SuggestionsSection({
  result,
  state,
  onOpen,
}: {
  result: WithSource<MealSuggestions> | null;
  state: 'ready' | 'loading' | 'offline';
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const items = result?.data.suggestions ?? [];

  let body: React.ReactNode;
  if (result && items.length > 0) {
    body = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleed to the screen edge on phones so the next card peeks in (a swipe hint).
        className="-mx-5 lg:mx-0"
        contentContainerClassName="gap-3 px-5 lg:px-0"
        snapToInterval={Platform.OS === 'web' ? undefined : 236}
        decelerationRate="fast"
      >
        {items.map((item, index) => {
          const name =
            i18n.language === 'bn' && item.recipes?.name_bn
              ? item.recipes.name_bn
              : (item.recipes?.name ?? t('home.suggestions.unnamed'));
          return (
            <FadeIn key={item.meal_slot} delay={index * 70} from="right">
              <Pressable
                onPress={onOpen}
                className={cn(
                  'bg-card border-border active:bg-muted w-56 gap-3 rounded-3xl border p-4 shadow-sm shadow-black/5',
                  Platform.select({ web: 'transition-colors hover:bg-muted' }),
                )}
              >
                <View
                  className={cn(
                    'h-24 items-center justify-center rounded-2xl',
                    SLOT_TONE[item.meal_slot],
                  )}
                >
                  <Icon
                    as={MEAL_ICONS[item.meal_slot]}
                    size={36}
                    strokeWidth={1.5}
                    className="text-olive"
                  />
                </View>
                <View className="gap-1">
                  <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {t(`home.meals.${item.meal_slot}`)}
                  </Text>
                  <Text numberOfLines={2} className="min-h-[44px] font-semibold leading-[22px]">
                    {name}
                  </Text>
                  <Text variant="muted">
                    {t('home.suggestions.portion', {
                      kcal: Math.round(item.kcal).toLocaleString(),
                      grams: Math.round(item.grams).toLocaleString(),
                    })}
                  </Text>
                </View>
                {item.reason ? (
                  <Text className="text-muted-foreground text-xs leading-[18px]">
                    {item.reason}
                  </Text>
                ) : null}
              </Pressable>
            </FadeIn>
          );
        })}
      </ScrollView>
    );
  } else if (result) {
    body = (
      <View className="bg-card border-border rounded-3xl border p-5">
        <Text className="font-semibold">{t('home.suggestions.emptyTitle')}</Text>
        <Text variant="muted" className="mt-1 leading-5">
          {t('home.suggestions.emptyBody')}
        </Text>
      </View>
    );
  } else if (state === 'loading') {
    body = (
      <View className="flex-row gap-3" aria-busy>
        <Skeleton className="h-56 w-56 rounded-3xl" />
        <Skeleton className="h-56 w-56 rounded-3xl" />
      </View>
    );
  } else {
    body = <InlineState kind="offline" />;
  }

  return (
    <View>
      <SectionHeader
        title={t('home.suggestions.title')}
        badge={result?.demo ? <PreviewBadge /> : null}
      />
      {body}
    </View>
  );
}
