'use client';

import { type FertileWindow, periodDays } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, ChevronLeft, ChevronRight, cn, Icon, Text } from '@aurora/ui';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { tapHaptic } from '../../../lib/haptics';
import { useDateLocale } from '../../home/use-date-locale';
import { usePeriodsInMonth } from '../queries';

const ISO = 'yyyy-MM-dd';

/**
 * The cycle month view: logged period days filled, the backend's estimated fertile window marked
 * (only when it returned one), today ringed. Tapping a day selects it; the screen shows its details.
 */
export function CycleCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
  fertileWindow,
}: {
  /** First day of the month shown. */
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: string;
  onSelect: (day: string) => void;
  today: string;
  fertileWindow: FertileWindow | null | undefined;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const from = format(startOfMonth(month), ISO);
  const to = format(endOfMonth(month), ISO);
  const periods = usePeriodsInMonth({ from, to });

  const marked = useMemo(
    () => periodDays(periods.data ?? [], { from, to, today }),
    [periods.data, from, to, today],
  );

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { locale });
    const last = endOfWeek(endOfMonth(month), { locale });
    const days: Date[] = [];
    for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
    return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [month, locale]);

  const inFertile = (iso: string) =>
    Boolean(fertileWindow && iso >= fertileWindow.start && iso <= fertileWindow.end);

  return (
    <View className="gap-3">
      <View className="flex-row items-center">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('common.previousMonth')}
          onPress={() => onMonthChange(addMonths(month, -1))}
        >
          <Icon as={ChevronLeft} size={20} />
        </Button>
        <Text className="flex-1 text-center text-base font-semibold" aria-live="polite">
          {format(month, 'MMMM yyyy', { locale })}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('common.nextMonth')}
          onPress={() => onMonthChange(addMonths(month, 1))}
        >
          <Icon as={ChevronRight} size={20} />
        </Button>
      </View>

      <View className="flex-row" aria-hidden>
        {weeks[0]?.map((day) => (
          <Text
            key={day.toISOString()}
            className="text-muted-foreground flex-1 text-center text-xs"
          >
            {format(day, 'EEEEE', { locale })}
          </Text>
        ))}
      </View>

      <View aria-busy={periods.isLoading} className={cn(periods.isLoading && 'opacity-60')}>
        {weeks.map((week) => (
          <View key={week[0]?.toISOString()} className="flex-row">
            {week.map((day) => {
              const iso = format(day, ISO);
              if (!isSameMonth(day, month)) {
                return <View key={iso} className="h-11 flex-1" />;
              }
              const period = marked.has(iso);
              const fertile = !period && inFertile(iso);
              const isSelected = iso === selected;
              const isToday = iso === today;
              const label = [
                format(day, 'PPPP', { locale }),
                period ? t('cycle.calendar.period') : null,
                fertile ? t('cycle.calendar.fertile') : null,
                isToday ? t('cycle.calendar.today') : null,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <View key={iso} className="h-11 flex-1 items-center justify-center">
                  <Pressable
                    role="button"
                    aria-label={label}
                    aria-selected={isSelected}
                    onPress={() => {
                      tapHaptic();
                      onSelect(iso);
                    }}
                    className={cn(
                      'h-10 w-10 items-center justify-center rounded-full',
                      period && 'bg-secondary',
                      fertile && 'border-accent bg-accent/10 border border-dashed',
                      isToday && !isSelected && 'border-primary border-2',
                      isSelected && 'bg-primary',
                      !period && !fertile && !isSelected && 'active:bg-muted hover:bg-muted',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        isSelected ? 'text-primary-foreground font-semibold' : 'text-foreground',
                        isToday && !isSelected && 'font-semibold',
                        iso > today && !isSelected && 'text-muted-foreground',
                      )}
                    >
                      {format(day, 'd', { locale })}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2 px-1" aria-hidden>
        <Legend swatch="bg-secondary" label={t('cycle.calendar.period')} />
        {fertileWindow ? (
          <Legend
            swatch="border-accent bg-accent/10 border border-dashed"
            label={t('cycle.calendar.fertile')}
          />
        ) : null}
        <Legend swatch="border-primary border-2" label={t('cycle.calendar.today')} />
      </View>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn('h-3.5 w-3.5 rounded-full', swatch)} />
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </View>
  );
}
