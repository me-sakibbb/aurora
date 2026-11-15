'use client';

import { MOOD_LEVELS, type MoodLog } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, ChevronLeft, ChevronRight, cn, Icon, Text } from '@mybela/ui';
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
import { MoodFace } from '../../../components/mood-face';
import { tapHaptic } from '../../../lib/haptics';
import { useDateLocale } from '../../home/use-date-locale';
import { useMoodMonth } from '../queries';
import { useRowWidth } from './visuals';

const ISO = 'yyyy-MM-dd';

/**
 * The month at a glance: each checked-in day shows its mood face, today is ringed and the
 * selected day is outlined. Shows only what was logged; nothing is averaged or predicted.
 */
export function MoodCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
}: {
  /** First day of the month shown. */
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: string;
  onSelect: (day: string) => void;
  today: string;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const logs = useMoodMonth(month);
  // Day circles sized from the grid's width so seven fit on any phone.
  const grid = useRowWidth();
  const circle = grid.width ? Math.min(44, Math.floor(grid.width / 7) - 2) : 40;
  const face = circle - 8;

  const byDay = useMemo(
    () => new Map((logs.data ?? []).map((log) => [log.day, log] as [string, MoodLog])),
    [logs.data],
  );

  const weeks = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { locale });
    const last = endOfWeek(endOfMonth(month), { locale });
    const days: Date[] = [];
    for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
    return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  }, [month, locale]);

  const isCurrentMonth = isSameMonth(month, new Date());

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
          disabled={isCurrentMonth}
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

      <View
        onLayout={grid.onLayout}
        aria-busy={logs.isLoading}
        className={cn(logs.isLoading && 'opacity-60')}
      >
        {weeks.map((week) => (
          <View key={week[0]?.toISOString()} className="flex-row">
            {week.map((day) => {
              const iso = format(day, ISO);
              if (!isSameMonth(day, month)) {
                return <View key={iso} style={{ height: circle + 4 }} className="flex-1" />;
              }
              const log = byDay.get(iso);
              const isSelected = iso === selected;
              const isToday = iso === today;
              const future = iso > today;
              const label = [
                format(day, 'PPPP', { locale }),
                log ? t(`mood.levels.mood.${log.mood}`) : null,
                isToday ? t('cycle.calendar.today') : null,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <View
                  key={iso}
                  style={{ height: circle + 4 }}
                  className="flex-1 items-center justify-center"
                >
                  <Pressable
                    role="button"
                    aria-label={label}
                    aria-selected={isSelected}
                    disabled={future}
                    onPress={() => {
                      tapHaptic();
                      onSelect(iso);
                    }}
                    style={{ width: circle, height: circle }}
                    className={cn(
                      'items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-primary'
                        : isToday
                          ? 'border-secondary'
                          : 'border-transparent',
                      !log && !future && 'active:bg-muted hover:bg-muted',
                    )}
                  >
                    {log ? (
                      <MoodFace level={log.mood} size={face} />
                    ) : (
                      <Text
                        className={cn(
                          'text-sm',
                          future ? 'text-muted-foreground/50' : 'text-foreground',
                          (isToday || isSelected) && 'font-semibold',
                        )}
                      >
                        {format(day, 'd', { locale })}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend: the five faces, low to high. */}
      <View className="flex-row items-center justify-center gap-2 pt-1" aria-hidden>
        <Text className="text-muted-foreground text-xs">{t('mood.levels.mood.1')}</Text>
        {MOOD_LEVELS.map((level) => (
          <MoodFace key={level} level={level} size={16} />
        ))}
        <Text className="text-muted-foreground text-xs">{t('mood.levels.mood.5')}</Text>
      </View>
    </View>
  );
}
