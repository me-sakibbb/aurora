'use client';

import { useTranslation } from '@aurora/i18n';
import { ChevronLeft, ChevronRight, cn, Icon, type IconComponent, Text } from '@aurora/ui';
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

/** How far back the calendar goes. Older than this, "I don't recall" is the better answer. */
const MONTHS_BACK = 6;

/**
 * Month-grid date picker for past dates (no native date picker dependency, same on web and
 * Android). `value` and `onChange` use `YYYY-MM-DD`. Future days are disabled.
 */
export function PastDateCalendar({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const today = startOfDay(new Date());
  const selected = value ? parseISO(value) : undefined;
  const [month, setMonth] = useState(() => startOfMonth(selected ?? today));
  const earliest = startOfMonth(subMonths(today, MONTHS_BACK));

  const gridStart = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7)).filter((week) =>
    week.some((day) => isSameMonth(day, month)),
  );

  const canGoBack = isAfter(month, earliest);
  const canGoForward = isAfter(startOfMonth(today), month);

  return (
    <View
      className="bg-card border-border gap-2 rounded-2xl border-2 p-4 shadow-sm shadow-black/5"
      aria-label={label}
    >
      <View className="flex-row items-center justify-between">
        <MonthButton
          icon={ChevronLeft}
          label={t('onboarding.calendar.previousMonth')}
          disabled={!canGoBack}
          onPress={() => setMonth((m) => subMonths(m, 1))}
        />
        <Text className="text-base font-semibold" aria-live="polite">
          {format(month, 'MMMM yyyy')}
        </Text>
        <MonthButton
          icon={ChevronRight}
          label={t('onboarding.calendar.nextMonth')}
          disabled={!canGoForward}
          onPress={() => setMonth((m) => addMonths(m, 1))}
        />
      </View>

      <View className="flex-row" aria-hidden>
        {days.slice(0, 7).map((day) => (
          <Text
            key={day.toISOString()}
            className="text-muted-foreground flex-1 text-center text-xs"
          >
            {format(day, 'EEEEE')}
          </Text>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week[0]?.toISOString()} className="flex-row">
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const disabled = !inMonth || isAfter(day, today);
            const iso = format(day, 'yyyy-MM-dd');
            const isSelected = value === iso;
            const isToday = isSameDay(day, today);
            return (
              <View key={iso} className="flex-1 items-center">
                {inMonth ? (
                  <Pressable
                    role="button"
                    aria-label={format(day, 'd MMMM yyyy')}
                    aria-selected={isSelected}
                    disabled={disabled}
                    onPress={() => onChange(iso)}
                    className={cn(
                      'h-10 w-10 items-center justify-center rounded-full active:opacity-60',
                      isToday && !isSelected && 'border-sage border',
                      isSelected && 'bg-primary',
                      disabled && 'opacity-30',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        isSelected && 'text-primary-foreground font-semibold',
                      )}
                    >
                      {format(day, 'd')}
                    </Text>
                  </Pressable>
                ) : (
                  <View className="h-10 w-10" />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MonthButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      className={cn(
        'bg-muted h-9 w-9 items-center justify-center rounded-full active:opacity-60',
        disabled && 'opacity-30',
      )}
    >
      <Icon as={icon} size={18} />
    </Pressable>
  );
}
