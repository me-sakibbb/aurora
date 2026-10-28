'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, ChevronLeft, ChevronRight, cn, Icon, Text } from '@aurora/ui';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDateLocale } from '../features/home/use-date-locale';
import { tapHaptic } from '../lib/haptics';

const ISO = 'yyyy-MM-dd';

/**
 * A month calendar for picking a day (`yyyy-MM-dd`). Plain React Native, so it's the same on web
 * and Android with no native picker. Days after `max` (usually today) can't be picked. With
 * `rangeEnd`, the days from `value` to `rangeEnd` are marked as one span (e.g. a period); the
 * parent decides what a tap means.
 */
export function DatePicker({
  value,
  onChange,
  max,
  label,
  rangeEnd,
}: {
  value: string | null;
  /** Last day of a marked span starting at `value`. */
  rangeEnd?: string | null;
  onChange: (date: string) => void;
  max?: string;
  /** Accessible name of the calendar. */
  label: string;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [month, setMonth] = useState(() =>
    startOfMonth(value ? parseISO(value) : max ? parseISO(max) : new Date()),
  );

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { locale });
    const last = endOfWeek(endOfMonth(month), { locale });
    const days: Date[] = [];
    for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
    return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [month, locale]);

  const canGoForward = !max || format(addMonths(month, 1), ISO) <= max;

  return (
    <View aria-label={label} className="gap-2">
      <View className="flex-row items-center">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('common.previousMonth')}
          onPress={() => setMonth((m) => addMonths(m, -1))}
        >
          <Icon as={ChevronLeft} size={20} />
        </Button>
        <Text className="flex-1 text-center font-semibold" aria-live="polite">
          {format(month, 'MMMM yyyy', { locale })}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('common.nextMonth')}
          disabled={!canGoForward}
          onPress={() => setMonth((m) => addMonths(m, 1))}
        >
          <Icon as={ChevronRight} size={20} />
        </Button>
      </View>
      <View className="flex-row" aria-hidden>
        {weeks[0]?.map((day) => (
          <Text
            key={day.toISOString()}
            className="text-muted-foreground flex-1 text-center text-xs font-medium"
          >
            {format(day, 'EEEEE', { locale })}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.toISOString()} className="flex-row">
          {week.map((day) => {
            const iso = format(day, ISO);
            const inMonth = isSameMonth(day, month);
            const disabled = Boolean(max && iso > max);
            const selected = iso === value || (rangeEnd != null && iso === rangeEnd);
            const between = value !== null && rangeEnd != null && iso > value && iso < rangeEnd;
            return (
              <View key={iso} className="flex-1 items-center py-0.5">
                {inMonth ? (
                  <Pressable
                    role="button"
                    aria-label={format(day, 'PPPP', { locale })}
                    aria-selected={selected || between}
                    disabled={disabled}
                    onPress={() => {
                      tapHaptic();
                      onChange(iso);
                    }}
                    className={cn(
                      'h-10 w-10 items-center justify-center rounded-full',
                      selected
                        ? 'bg-primary'
                        : between
                          ? 'bg-primary/20'
                          : 'active:bg-muted hover:bg-muted',
                      disabled && 'opacity-30',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        selected
                          ? 'text-primary-foreground font-bold'
                          : between
                            ? 'font-bold'
                            : 'font-medium',
                        iso === max && !selected && 'text-accent font-bold',
                      )}
                    >
                      {format(day, 'd', { locale })}
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
