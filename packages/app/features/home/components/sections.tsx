'use client';

import type { CycleStatus, Insight, MoodToday, RecentLog, WeekActivity } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Angry,
  ArrowRight,
  CalendarHeart,
  cn,
  Flame,
  Frown,
  Gift,
  Icon,
  type IconComponent,
  Laugh,
  Lightbulb,
  Meh,
  MessageCircleHeart,
  Smile,
  Sparkles,
  Text,
  Utensils,
} from '@aurora/ui';
import { format, isToday, parseISO } from 'date-fns';
import { Platform, Pressable, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { tapHaptic } from '../../../lib/haptics';
import { useDateLocale } from '../use-date-locale';
import { MEAL_ICONS, Panel, PreviewBadge, SectionHeader } from './primitives';

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

// ─── Aurora noticed (F20) ───────────────────────────────────────────────────────────────────────

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

// ─── This week: streak (F22), flex chips (F19), insights summary (F4) ───────────────────────────

export function WeekCard({
  week,
  insights,
  demo,
  onSeeAll,
}: {
  week: WeekActivity;
  insights: Insight[];
  demo: boolean;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();

  return (
    <View>
      <SectionHeader
        title={t('home.week.title')}
        badge={demo ? <PreviewBadge /> : null}
        action={t('home.seeAll')}
        onAction={onSeeAll}
      />
      <Panel className="gap-5">
        <View className="flex-row items-center gap-3">
          <View className="bg-taupe/35 h-12 w-12 items-center justify-center rounded-2xl">
            <Icon as={Flame} size={24} className="text-olive" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold">
              {t('home.week.streak', { count: week.streak_days })}
            </Text>
            <Text variant="muted">{t('home.week.streakHint')}</Text>
          </View>
        </View>

        <View className="flex-row justify-between">
          {week.days.map((day, index) => {
            const date = parseISO(day.date);
            const today = isToday(date);
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
                    day.logged ? t('home.week.logged') : t('home.week.notLogged')
                  }`}
                  className={cn(
                    'h-9 w-9 items-center justify-center rounded-full',
                    day.logged ? 'bg-primary' : 'bg-muted',
                    today && 'border-taupe border-2',
                  )}
                >
                  {day.logged ? <Icon as={Flame} size={16} className="text-taupe" /> : null}
                </View>
              </FadeIn>
            );
          })}
        </View>

        {week.flex_chips > 0 ? (
          <View className="bg-sage/10 -mt-1 flex-row items-center gap-2.5 rounded-2xl px-3 py-2.5">
            <Icon as={Gift} size={18} className="text-accent" />
            <Text className="flex-1 text-sm">
              {t('home.week.chips', { count: week.flex_chips })}
            </Text>
          </View>
        ) : null}

        {insights.length > 0 ? (
          <View className="border-border gap-3 border-t pt-4">
            {insights.map((insight) => (
              <View key={insight.id} className="flex-row gap-3">
                <Icon as={Lightbulb} size={18} className="text-accent mt-0.5" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold">{insight.title}</Text>
                  <Text variant="muted" className="leading-5">
                    {insight.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Panel>
    </View>
  );
}

// ─── Mood check-in (F12 entry point) ────────────────────────────────────────────────────────────

const MOODS: { value: 1 | 2 | 3 | 4 | 5; icon: IconComponent }[] = [
  { value: 1, icon: Angry },
  { value: 2, icon: Frown },
  { value: 3, icon: Meh },
  { value: 4, icon: Smile },
  { value: 5, icon: Laugh },
];

export function MoodCard({
  mood,
  demo,
  onPick,
}: {
  mood: MoodToday;
  demo: boolean;
  onPick: (value: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel>
      <View className="mb-4 flex-row items-center gap-2">
        <Text className="text-lg font-bold tracking-tight">
          {mood.mood ? t('home.mood.done') : t('home.mood.title')}
        </Text>
        {demo ? <PreviewBadge /> : null}
      </View>
      <View className="flex-row justify-between gap-2">
        {MOODS.map(({ value, icon }) => {
          const picked = mood.mood === value;
          return (
            <Pressable
              key={value}
              onPress={() => {
                tapHaptic();
                onPick(value);
              }}
              aria-label={t(`home.mood.options.${value}`)}
              className={cn(
                'aspect-square max-w-16 flex-1 items-center justify-center rounded-2xl active:scale-95',
                picked ? 'bg-primary' : 'bg-muted',
                Platform.select({ web: 'transition-transform hover:scale-105' }),
              )}
            >
              <Icon
                as={icon}
                size={26}
                strokeWidth={1.75}
                className={picked ? 'text-primary-foreground' : 'text-foreground'}
              />
            </Pressable>
          );
        })}
      </View>
      <View className="mt-2 flex-row justify-between px-1">
        <Text className="text-muted-foreground text-xs">{t('home.mood.low')}</Text>
        <Text className="text-muted-foreground text-xs">{t('home.mood.high')}</Text>
      </View>
    </Panel>
  );
}

// ─── Cycle preview (F4/F11, only for opted-in accounts) ─────────────────────────────────────────

export function CyclePreview({ status, onOpen }: { status: CycleStatus; onOpen: () => void }) {
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
          <Text className="text-muted-foreground leading-5">{t('home.cycle.notEnough')}</Text>
        )}
      </Panel>
    </Pressable>
  );
}

// ─── Today's log (F4 recent logs) ───────────────────────────────────────────────────────────────

export function RecentLogs({
  logs,
  demo,
  onSeeAll,
  onLog,
}: {
  logs: RecentLog[];
  demo: boolean;
  onSeeAll: () => void;
  onLog: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = useDateLocale();

  return (
    <View>
      <SectionHeader
        title={t('home.recent.title')}
        badge={demo ? <PreviewBadge /> : null}
        action={logs.length > 0 ? t('home.seeAll') : undefined}
        onAction={onSeeAll}
      />
      {logs.length === 0 ? (
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
      ) : (
        <Panel className="gap-0 p-2">
          {logs.map((log, index) => (
            <View
              key={log.id}
              className={cn(
                'flex-row items-center gap-3 px-3 py-3',
                index > 0 && 'border-border border-t',
              )}
            >
              <View className="bg-muted h-11 w-11 items-center justify-center rounded-2xl">
                <Icon as={MEAL_ICONS[log.meal_slot]} size={20} className="text-foreground" />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-semibold">
                  {i18n.language === 'bn' && log.name_bn ? log.name_bn : log.name}
                </Text>
                <Text variant="muted" numberOfLines={1}>
                  {t(`home.meals.${log.meal_slot}`)} ·{' '}
                  {format(parseISO(log.logged_at), 'h:mm a', { locale })}
                </Text>
              </View>
              <Text className="text-sm font-semibold">
                {t('home.kcalRange', {
                  min: log.kcal.min.toLocaleString(),
                  max: log.kcal.max.toLocaleString(),
                })}
              </Text>
            </View>
          ))}
        </Panel>
      )}
    </View>
  );
}
