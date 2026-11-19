'use client';

import {
  type CalorieInsights,
  type CycleStatus,
  dayHasLogs,
  type Insight,
  type MoodLevel,
  type MoodLog,
  type RecentLog,
  type WeekActivity,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import {
  ArrowRight,
  CalendarHeart,
  cn,
  Flame,
  Gift,
  Icon,
  type IconComponent,
  MessageCircleHeart,
  Smile,
  Sparkles,
  Text,
  Utensils,
} from '@mybela/ui';
import { format, isToday, parseISO } from 'date-fns';
import { Platform, Pressable, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { FoodImage } from '../../../components/food-image';
import { MoodFace } from '../../../components/mood-face';
import { Skeleton } from '../../../components/skeleton';
import { tapHaptic } from '../../../lib/haptics';
import { FaceRow, WaitingNote } from '../../mood/components/entry';
import type { SectionState } from '../queries';
import { useDateLocale } from '../use-date-locale';
import { InlineState, Panel, PreviewBadge, SectionHeader } from './primitives';

const pressable = Platform.select({ web: 'transition-colors hover:bg-muted', default: '' });

// ─── Quick actions (F4: jump into food, mood, chat) ─────────────────────────────────────────────

type QuickAction = {
  key: 'food' | 'mood' | 'chat';
  href: string;
  icon: IconComponent;
  tile: string;
  iconClass: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'food',
    href: '/food',
    icon: Utensils,
    tile: 'bg-primary',
    iconClass: 'text-primary-foreground',
  },
  { key: 'mood', href: '/mood', icon: Smile, tile: 'bg-taupe', iconClass: 'text-olive' },
  {
    key: 'chat',
    href: '/chat',
    icon: MessageCircleHeart,
    tile: 'bg-sage',
    iconClass: 'text-ivory',
  },
];

export function QuickActions({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3">
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => {
            tapHaptic();
            onNavigate(action.href);
          }}
          className={cn(
            'bg-card border-border active:bg-muted flex-1 items-start gap-3 rounded-3xl border p-4 shadow-sm shadow-black/5',
            pressable,
          )}
        >
          <View className={cn('h-11 w-11 items-center justify-center rounded-2xl', action.tile)}>
            <Icon as={action.icon} size={22} className={action.iconClass} />
          </View>
          <Text className="w-full text-sm font-semibold leading-5">
            {t(`home.quick.${action.key}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── MyBela noticed (F20) ───────────────────────────────────────────────────────────────────────

export function NoticedCard({
  insight,
  demo,
  onAsk,
}: {
  insight: Insight;
  demo: boolean;
  onAsk: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-taupe/35 border-taupe/50 overflow-hidden rounded-3xl border p-5">
      <View aria-hidden className="bg-taupe/40 absolute -right-8 -top-8 h-28 w-28 rounded-full" />
      <View className="mb-3 flex-row items-center gap-2">
        <View className="bg-olive h-8 w-8 items-center justify-center rounded-full">
          <Icon as={Sparkles} size={16} className="text-ivory" />
        </View>
        <Text className="text-olive text-xs font-bold uppercase tracking-[1.5px]">
          {t('home.noticed.title')}
        </Text>
        {demo ? <PreviewBadge /> : null}
      </View>
      <Text className="text-olive mb-1 text-lg font-bold leading-6">{insight.title}</Text>
      <Text className="text-olive/80 leading-6">{insight.body}</Text>
      <Pressable
        onPress={onAsk}
        className="mt-4 flex-row items-center gap-1.5 self-start rounded-full py-1 active:opacity-60"
      >
        <Text className="text-olive text-sm font-semibold">{t('home.noticed.ask')}</Text>
        <Icon as={ArrowRight} size={16} className="text-olive" />
      </Pressable>
    </View>
  );
}

// ─── This week: logged days + totals (F4, live), streak (F22) and flex chips (F19, preview) ─────

export function WeekCard({
  week,
  calories,
  state,
  onRetry,
  onSeeAll,
}: {
  /** Streak and chips: sample data until their endpoints exist. */
  week: WeekActivity;
  /** `GET /calories/insights` for the last seven days. `null` = no profile yet. */
  calories: CalorieInsights | null | undefined;
  state: SectionState;
  onRetry: () => void;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();

  let live: React.ReactNode;
  if (state === 'loading') {
    live = (
      <View className="flex-row justify-between" aria-busy>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-9 rounded-full" />
        ))}
      </View>
    );
  } else if (state !== 'ready') {
    live = <InlineState kind={state === 'offline' ? 'offline' : 'error'} onRetry={onRetry} />;
  } else if (!calories) {
    live = <Text variant="muted">{t('home.week.noProfile')}</Text>;
  } else {
    const { summary } = calories;
    live = (
      <>
        <View className="flex-row justify-between">
          {calories.daily.map((day, index) => {
            const date = parseISO(day.date);
            const today = isToday(date);
            const logged = dayHasLogs(day);
            return (
              <FadeIn key={day.date} delay={index * 40} className="items-center gap-1.5">
                <Text
                  className={cn(
                    'text-xs',
                    today ? 'text-foreground font-bold' : 'text-muted-foreground font-medium',
                  )}
                >
                  {format(date, 'EEEEE', { locale })}
                </Text>
                <View
                  aria-label={`${format(date, 'EEEE', { locale })}: ${
                    logged ? t('home.week.logged') : t('home.week.notLogged')
                  }`}
                  className={cn(
                    'h-9 w-9 items-center justify-center rounded-full',
                    logged ? 'bg-primary' : 'bg-muted',
                    today && 'border-taupe border-2',
                  )}
                >
                  {logged ? <Icon as={Flame} size={16} className="text-taupe" /> : null}
                </View>
              </FadeIn>
            );
          })}
        </View>
        <View className="border-border flex-row gap-2 border-t pt-4">
          <Stat
            label={t('home.week.loggedDays')}
            value={t('home.week.loggedDaysValue', {
              count: summary.days_with_logs,
              total: summary.days_in_range,
            })}
          />
          <Stat
            label={t('home.week.average')}
            value={t('home.kcal', {
              value: Math.round(summary.average_logged_day_kcal).toLocaleString(),
            })}
          />
          {summary.days_at_or_below_target != null && summary.days_compared_to_target > 0 ? (
            <Stat
              label={t('home.week.onTarget')}
              value={t('home.week.onTargetValue', {
                count: summary.days_at_or_below_target,
                total: summary.days_compared_to_target,
              })}
            />
          ) : null}
        </View>
      </>
    );
  }

  return (
    <View>
      <SectionHeader title={t('home.week.title')} action={t('home.seeAll')} onAction={onSeeAll} />
      <Panel className="gap-5">
        <View className="flex-row items-center gap-3">
          <View className="bg-taupe/35 h-12 w-12 items-center justify-center rounded-2xl">
            <Icon as={Flame} size={24} className="text-olive" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-bold">
                {t('home.week.streak', { count: week.streak_days })}
              </Text>
              <PreviewBadge />
            </View>
            <Text variant="muted">{t('home.week.streakHint')}</Text>
          </View>
        </View>

        {live}

        {week.flex_chips > 0 ? (
          <View className="bg-sage/10 -mt-1 flex-row items-center gap-2.5 rounded-2xl px-3 py-2.5">
            <Icon as={Gift} size={18} className="text-accent" />
            <Text className="flex-1 text-sm">
              {t('home.week.chips', { count: week.flex_chips })}
            </Text>
            <PreviewBadge />
          </View>
        ) : null}
      </Panel>
    </View>
  );
}

/** One of the week's figures, shown as the backend returned it. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-muted/60 flex-1 gap-0.5 rounded-2xl px-3 py-2.5">
      <Text className="text-base font-bold">{value}</Text>
      <Text variant="muted" className="text-xs leading-4">
        {label}
      </Text>
    </View>
  );
}

// ─── Mood check-in (F12 entry point) ────────────────────────────────────────────────────────────

/**
 * Today's mood: five faces that start the check-in with that mood picked, or, once checked in,
 * today's face with a way into the Mood screen.
 */
export function MoodCard({
  entry,
  waiting,
  onPick,
  onOpen,
}: {
  entry: MoodLog | null | undefined;
  waiting: boolean;
  onPick: (value: MoodLevel) => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();

  if (entry) {
    return (
      <Pressable
        onPress={onOpen}
        role="button"
        aria-label={`${t('home.mood.done')}: ${t(`mood.levels.mood.${entry.mood}`)}`}
        className={cn(
          'bg-card border-border flex-row items-center gap-4 rounded-3xl border p-5 shadow-sm shadow-black/5 active:opacity-80',
          pressable,
        )}
      >
        <MoodFace level={entry.mood} size={52} />
        <View className="flex-1 gap-0.5">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-[1.5px]">
            {t('home.mood.done')}
          </Text>
          <Text className="text-lg font-bold tracking-tight">
            {t(`mood.levels.mood.${entry.mood}`)}
          </Text>
          {waiting ? <WaitingNote /> : null}
        </View>
        <Icon as={ArrowRight} size={18} className="text-muted-foreground" />
      </Pressable>
    );
  }

  return (
    <Panel>
      <View className="mb-4 flex-row items-center gap-2">
        <Text className="flex-1 text-lg font-bold tracking-tight">{t('home.mood.title')}</Text>
        <Pressable onPress={onOpen} className="-my-1 rounded-full px-2 py-1 active:opacity-60">
          <Text className="text-muted-foreground text-sm font-semibold">
            {t('home.mood.history')}
          </Text>
        </Pressable>
      </View>
      {/* Usable even before today's entry is known: the backend keeps one per day, and the
          check-in brings any existing answers along. */}
      <FaceRow onPick={onPick} max={48} />
      <View className="mt-2 flex-row justify-between px-1">
        <Text className="text-muted-foreground text-xs">{t('home.mood.low')}</Text>
        <Text className="text-muted-foreground text-xs">{t('home.mood.high')}</Text>
      </View>
    </Panel>
  );
}

// ─── Cycle preview (F4/F11, only for opted-in accounts) ─────────────────────────────────────────

export function CyclePreview({
  status,
  fertilityOptIn,
  onOpen,
}: {
  status: CycleStatus;
  /** The person chose to see the fertile-window estimate (F11). */
  fertilityOptIn: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const window = status.fertility_window;

  return (
    <Pressable onPress={onOpen} className="active:opacity-90">
      <Panel className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="bg-taupe/35 h-11 w-11 items-center justify-center rounded-2xl">
            <Icon as={CalendarHeart} size={22} className="text-olive" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold tracking-tight">{t('home.cycle.title')}</Text>
            <Text variant="muted">{t('home.cycle.fertileWindow')}</Text>
          </View>
          <Icon as={ArrowRight} size={18} className="text-muted-foreground" />
        </View>
        {window ? (
          <>
            {/* Always the full range, never a single predicted day (F11). */}
            <Text className="text-xl font-bold">
              {t('home.cycle.range', {
                start: format(parseISO(window.start), 'd MMM', { locale }),
                end: format(parseISO(window.end), 'd MMM', { locale }),
              })}
            </Text>
            {window.note ? (
              <Text className="text-muted-foreground leading-5">{window.note}</Text>
            ) : null}
          </>
        ) : (
          <Text className="text-muted-foreground leading-5">
            {fertilityOptIn ? t('home.cycle.notEnough') : t('cycle.fertile.off')}
          </Text>
        )}
      </Panel>
    </Pressable>
  );
}

// ─── Today's log (F4 recent logs) ───────────────────────────────────────────────────────────────

export function RecentLogs({
  logs,
  state,
  onRetry,
  onSeeAll,
  onLog,
}: {
  logs: RecentLog[] | undefined;
  state: SectionState;
  onRetry: () => void;
  onSeeAll: () => void;
  onLog: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = useDateLocale();

  let body: React.ReactNode;
  if (state === 'loading') {
    body = <Skeleton className="h-40 rounded-3xl" aria-busy />;
  } else if (state !== 'ready' || !logs) {
    body = <InlineState kind={state === 'offline' ? 'offline' : 'error'} onRetry={onRetry} />;
  } else if (logs.length === 0) {
    body = (
      <Panel className="items-center gap-3 py-8">
        <View className="bg-muted h-14 w-14 items-center justify-center rounded-full">
          <Icon as={Utensils} size={24} className="text-muted-foreground" />
        </View>
        <Text className="text-center font-semibold">{t('home.recent.emptyTitle')}</Text>
        <Text variant="muted" className="text-center">
          {t('home.recent.emptyBody')}
        </Text>
        <Pressable onPress={onLog} className="bg-primary mt-1 rounded-full px-5 py-2.5">
          <Text className="text-primary-foreground text-sm font-semibold">
            {t('home.today.logMeal')}
          </Text>
        </Pressable>
      </Panel>
    );
  } else {
    body = (
      <Panel className="gap-0 p-2">
        {logs.map((log, index) => {
          const name =
            (i18n.language === 'bn' && log.name_bn ? log.name_bn : log.name) ??
            t('home.recent.unnamed');
          const time = format(parseISO(log.logged_at), 'h:mm a', { locale });
          return (
            <View
              key={log.id}
              className={cn(
                'flex-row items-center gap-3 px-3 py-3',
                index > 0 && 'border-border border-t',
              )}
            >
              <View className="bg-muted h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
                <FoodImage
                  uri={log.image_url}
                  className="absolute inset-0"
                  fallback={<Icon as={Utensils} size={20} className="text-foreground" />}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-semibold">
                  {name}
                </Text>
                <Text variant="muted" numberOfLines={1}>
                  {log.grams != null
                    ? t('home.recent.meta', { time, grams: Math.round(log.grams) })
                    : time}
                </Text>
              </View>
              {log.kcal != null ? (
                <Text className="text-sm font-semibold">
                  {t('home.kcal', { value: Math.round(log.kcal).toLocaleString() })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Panel>
    );
  }

  return (
    <View>
      <SectionHeader
        title={t('home.recent.title')}
        action={logs && logs.length > 0 ? t('home.seeAll') : undefined}
        onAction={onSeeAll}
      />
      {body}
    </View>
  );
}
