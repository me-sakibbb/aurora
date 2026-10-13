'use client';

import type { DailySummary } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Check, cn, Icon, Plus, Text } from '@aurora/ui';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { ProgressRing } from '../../../components/progress-ring';
import { tapHaptic } from '../../../lib/haptics';
import { tokenColor } from '../../../lib/token-color';
import { useCountUp } from '../../../lib/use-count-up';
import { MEAL_ICONS, PreviewBadge } from './primitives';

/**
 * The day at a glance (F4): calories so far as a range, the daily target and progress (all as
 * returned by the backend), which meals are logged, and the main call to action.
 */
export function TodayCard({
  summary,
  demo,
  onLog,
}: {
  summary: DailySummary;
  demo: boolean;
  onLog: () => void;
}) {
  const { t } = useTranslation();
  const min = useCountUp(summary.consumed_kcal?.min ?? 0);
  const max = useCountUp(summary.consumed_kcal?.max ?? 0);
  const hasLogs = summary.consumed_kcal !== null;
  // Small phones (≤ 360dp) get a smaller ring so the meal list beside it doesn't truncate.
  const compact = useWindowDimensions().width < 380;

  return (
    <View className="bg-olive overflow-hidden rounded-[28px] p-5 shadow-lg shadow-black/20">
      {/* Dawn motif from the brand mark: a soft taupe sun rising behind the card. */}
      <View aria-hidden className="bg-taupe/20 absolute -right-16 -top-20 h-56 w-56 rounded-full" />
      <View
        aria-hidden
        className="bg-sage/25 absolute -bottom-24 -left-10 h-48 w-72 rounded-full"
      />

      <View className="mb-4 flex-row items-center gap-2">
        <Text className="text-ivory/70 text-xs font-semibold uppercase tracking-[1.5px]">
          {t('home.today.title')}
        </Text>
        {demo ? <PreviewBadge tone="olive" /> : null}
      </View>

      <View className="flex-row items-center gap-4">
        <ProgressRing
          size={compact ? 112 : 136}
          strokeWidth={compact ? 10 : 12}
          progress={summary.progress}
          color={tokenColor('taupe')}
          trackColor={tokenColor('ivory')}
          trackOpacity={0.14}
        >
          <View className="items-center px-3">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-ivory text-xl font-bold tracking-tight"
            >
              {hasLogs ? `${min.toLocaleString()}–${max.toLocaleString()}` : '0'}
            </Text>
            <Text className="text-ivory/60 mt-0.5 text-[11px] font-medium">
              {t('home.today.kcalSoFar')}
            </Text>
          </View>
        </ProgressRing>

        <View className="flex-1 gap-3">
          {summary.target_kcal ? (
            <View>
              <Text className="text-ivory/60 text-xs font-medium">{t('home.today.target')}</Text>
              <Text className="text-ivory text-lg font-bold">
                {t('home.kcal', { value: Math.round(summary.target_kcal).toLocaleString() })}
              </Text>
            </View>
          ) : null}
          <View className="gap-1.5">
            {summary.meals.map((meal) => {
              const done = meal.items > 0;
              return (
                <View key={meal.slot} className="flex-row items-center gap-2">
                  <View
                    className={cn(
                      'h-5 w-5 items-center justify-center rounded-full',
                      done ? 'bg-taupe' : 'border-ivory/30 border',
                    )}
                  >
                    {done ? (
                      <Icon as={Check} size={12} strokeWidth={3} className="text-olive" />
                    ) : null}
                  </View>
                  <Icon
                    as={MEAL_ICONS[meal.slot]}
                    size={14}
                    className={done ? 'text-ivory' : 'text-ivory/50'}
                  />
                  <Text className={cn('text-sm', done ? 'text-ivory' : 'text-ivory/50')}>
                    {t(`home.meals.${meal.slot}`)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => {
          tapHaptic();
          onLog();
        }}
        className={cn(
          'bg-ivory mt-5 h-12 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90',
          Platform.select({ web: 'transition-opacity hover:opacity-90' }),
        )}
      >
        <Icon as={Plus} size={20} strokeWidth={2.5} className="text-olive" />
        <Text className="text-olive font-semibold">{t('home.today.logMeal')}</Text>
      </Pressable>
    </View>
  );
}
