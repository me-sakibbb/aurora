'use client';

import type { CurrentPhase, FertileWindow, Period } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Button,
  CalendarHeart,
  ChevronRight,
  Droplet,
  Icon,
  type IconComponent,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Sunrise,
  Text,
} from '@aurora/ui';
import { format, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { Panel, PreviewBadge } from '../../home/components/primitives';
import { useDateLocale } from '../../home/use-date-locale';

function useLongDate() {
  const locale = useDateLocale();
  return (iso: string) => format(parseISO(iso), 'd MMMM', { locale });
}

function CardTitle({
  icon,
  title,
  badge,
}: {
  icon: IconComponent;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="bg-taupe/30 h-9 w-9 items-center justify-center rounded-xl">
        <Icon as={icon} size={18} className="text-olive" />
      </View>
      <Text role="heading" aria-level={2} className="flex-1 text-base font-semibold">
        {title}
      </Text>
      {badge}
    </View>
  );
}

/**
 * Today at the top of the tab (F10): the logged state of the period and the one action that fits
 * it, "log the start" or "log the end". Logged dates only; nothing is estimated here.
 */
export function TodayCard({
  today,
  latest,
  onStart,
  onEnd,
}: {
  today: string;
  latest: Period | undefined;
  onStart: () => void;
  onEnd: (period: Period) => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const long = useLongDate();
  const ongoing = latest && latest.ended_on === null ? latest : undefined;

  return (
    <Panel className="gap-4">
      <View className="gap-1">
        <Text className="text-muted-foreground text-sm">
          {format(parseISO(today), 'EEEE, d MMMM', { locale })}
        </Text>
        <Text className="text-xl font-semibold leading-7">
          {ongoing
            ? t('cycle.period.ongoingSince', { date: long(ongoing.started_on) })
            : latest
              ? t('cycle.period.lastStarted', { date: long(latest.started_on) })
              : t('cycle.period.noneYet')}
        </Text>
        {latest?.ended_on ? (
          <Text variant="muted">
            {t('cycle.period.lastEnded', { date: long(latest.ended_on) })}
          </Text>
        ) : null}
      </View>
      {ongoing ? (
        <Button size="lg" className="rounded-full" onPress={() => onEnd(ongoing)}>
          <Text>{t('cycle.period.logEnd')}</Text>
        </Button>
      ) : (
        <Button size="lg" className="rounded-full" onPress={onStart}>
          <Text>{t('cycle.period.logStart')}</Text>
        </Button>
      )}
    </Panel>
  );
}

/**
 * The day picked on the calendar: what's logged or estimated for it, and what can be done.
 * Future days can't be logged.
 */
export function DayDetails({
  day,
  today,
  period,
  fertile,
  onLogStart,
  onEdit,
}: {
  day: string;
  today: string;
  period: Period | undefined;
  /** The day is inside the backend's estimated fertile window. */
  fertile: boolean;
  onLogStart: (day: string) => void;
  onEdit: (period: Period) => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const long = useLongDate();

  let status = t('cycle.day.nothing');
  if (period) {
    status = period.ended_on
      ? t('cycle.day.period', { start: long(period.started_on), end: long(period.ended_on) })
      : t('cycle.day.periodOngoing', { start: long(period.started_on) });
  } else if (fertile) {
    status = t('cycle.day.fertile');
  } else if (day > today) {
    status = t('cycle.day.future');
  }

  return (
    <View className="bg-background gap-3 rounded-2xl p-4" aria-live="polite">
      <View className="gap-0.5">
        <Text className="font-semibold">
          {day === today
            ? t('cycle.day.today', { date: format(parseISO(day), 'd MMMM', { locale }) })
            : format(parseISO(day), 'EEEE, d MMMM', { locale })}
        </Text>
        <Text variant="muted">{status}</Text>
      </View>
      {period ? (
        <Pressable
          onPress={() => onEdit(period)}
          className="flex-row items-center gap-2 self-start rounded-full py-1 active:opacity-60"
        >
          <Icon as={Pencil} size={16} />
          <Text className="font-medium">{t('cycle.day.edit')}</Text>
        </Pressable>
      ) : day <= today ? (
        <Pressable
          onPress={() => onLogStart(day)}
          className="flex-row items-center gap-2 self-start rounded-full py-1 active:opacity-60"
        >
          <Icon as={Plus} size={16} />
          <Text className="font-medium">{t('cycle.day.logStart')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const PHASE_ICONS: Record<CurrentPhase['phase'], IconComponent> = {
  menstrual: Droplet,
  follicular: Sunrise,
  ovulatory: Sun,
  luteal: Moon,
};

/** Where the person is in their cycle, as worked out by the backend (F10). */
export function PhaseCard({ phase, demo }: { phase: CurrentPhase; demo: boolean }) {
  const { t } = useTranslation();
  return (
    <Panel className="gap-3">
      <CardTitle
        icon={PHASE_ICONS[phase.phase]}
        title={t('cycle.phase.title')}
        badge={demo ? <PreviewBadge /> : null}
      />
      <View className="gap-0.5">
        <Text className="text-lg font-medium">{t(`cycle.phase.names.${phase.phase}`)}</Text>
        {phase.day_of_cycle !== null ? (
          <Text variant="muted">{t('cycle.phase.day', { day: phase.day_of_cycle })}</Text>
        ) : null}
      </View>
      {phase.note ? <Text className="leading-6">{phase.note}</Text> : null}
    </Panel>
  );
}

/**
 * F11: the estimated fertile window, always as a full date range (never one predicted day), with
 * the backend's note in full. Without an estimate it says why, from the person's own setting.
 */
export function FertileWindowCard({
  window,
  optedIn,
  canOptIn,
  onSettings,
}: {
  window: FertileWindow | null | undefined;
  /** The person chose to see the estimate. */
  optedIn: boolean;
  /** The opt-in can be changed (it's stored on the profile row). */
  canOptIn: boolean;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  const long = useLongDate();

  return (
    <Panel className="gap-3">
      <CardTitle icon={CalendarHeart} title={t('cycle.fertile.title')} />
      {window ? (
        <>
          <Text className="text-lg font-medium">
            {t('home.cycle.range', { start: long(window.start), end: long(window.end) })}
          </Text>
          {window.note ? <Text className="leading-6">{window.note}</Text> : null}
        </>
      ) : optedIn ? (
        <Text className="text-muted-foreground leading-6">{t('cycle.fertile.notEnough')}</Text>
      ) : (
        <>
          <Text className="text-muted-foreground leading-6">{t('cycle.fertile.off')}</Text>
          {canOptIn ? (
            <Pressable
              onPress={onSettings}
              className="flex-row items-center gap-1 self-start rounded-full py-1 active:opacity-60"
            >
              <Text className="font-medium">{t('cycle.fertile.turnOn')}</Text>
              <Icon as={ChevronRight} size={16} />
            </Pressable>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/** One logged period in the history list. */
export function PeriodRow({ period, onPress }: { period: Period; onPress: () => void }) {
  const { t } = useTranslation();
  const long = useLongDate();
  const locale = useDateLocale();
  return (
    <Pressable
      onPress={onPress}
      aria-label={t('cycle.history.editLabel', { date: long(period.started_on) })}
      className="bg-card border-border active:bg-muted hover:bg-muted mb-2 min-h-16 flex-row items-center gap-3 rounded-2xl border px-4 py-3"
    >
      <View className="bg-secondary/50 h-9 w-9 items-center justify-center rounded-xl">
        <Icon as={Droplet} size={16} className="text-olive" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-medium">
          {period.ended_on
            ? t('home.cycle.range', { start: long(period.started_on), end: long(period.ended_on) })
            : t('cycle.period.ongoingSince', { date: long(period.started_on) })}
        </Text>
        <Text variant="muted" className="text-sm">
          {format(parseISO(period.started_on), 'yyyy', { locale })}
        </Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

/** Shown in place of the history while nothing has been logged. */
export function HistoryEmpty() {
  const { t } = useTranslation();
  return (
    <Panel className="items-center gap-3 py-8">
      <View className="bg-muted h-12 w-12 items-center justify-center rounded-full">
        <Icon as={Sparkles} size={22} className="text-muted-foreground" />
      </View>
      <Text className="text-center font-medium">{t('cycle.history.emptyTitle')}</Text>
      <Text variant="muted" className="text-center">
        {t('cycle.history.emptyBody')}
      </Text>
    </Panel>
  );
}
