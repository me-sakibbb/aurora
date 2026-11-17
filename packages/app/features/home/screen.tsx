'use client';

import { useTranslation } from '@mybela/i18n';
import { Flame, Icon, Text } from '@mybela/ui';
import { format } from 'date-fns';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useAppRouter } from '../../lib/navigation';
import { useCycleStatus } from '../cycle/queries';
import { MoodInsightCard } from '../mood/components/insight-card';
import { useDemoMoodInsight } from '../mood/demo';
import { checkInHref } from '../mood/links';
import { todayIso, useMoodDay, useMoodHistory, useWaitingMoodDays } from '../mood/queries';
import { useAccount } from '../shell/account';
import { HomeSkeleton, Veil } from './components/primitives';
import {
  CyclePreview,
  MoodCard,
  NoticedCard,
  QuickActions,
  RecentLogs,
  WeekCard,
} from './components/sections';
import { SuggestionsSection } from './components/suggestions';
import { TodayCard } from './components/today-card';
import { useDailySummary, useHomeDemo, useMealSuggestions, useProfile } from './queries';
import { useDateLocale } from './use-date-locale';

/** Greeting by local time of day (wording only; nothing health-related is derived). */
function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 17) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

/**
 * F4 Home dashboard: the day at a glance, quick ways into food / mood / chat, MyBela's
 * observation, the week, suggestions and today's log.
 *
 * Live data: profile (discreet mode), daily summary, cycle status, meal suggestions. Sections
 * without a backend endpoint yet show sample data marked "Preview" (see ./demo.ts).
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const locale = useDateLocale();
  const { firstName } = useAccount();

  const profile = useProfile();
  const cycle = useCycleStatus();
  const summary = useDailySummary();
  const suggestions = useMealSuggestions();
  const demo = useHomeDemo();
  const today = todayIso();
  const mood = useMoodDay(today);
  const moodWaiting = useWaitingMoodDays();
  const moodHistory = useMoodHistory();
  // F17 sample until `GET /mood/insights` exists (see ../mood/demo.ts).
  const moodInsight = useDemoMoodInsight((moodHistory.data?.pages[0]?.length ?? 0) > 0);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const discreet = profile.data?.discreet_mode === true;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      profile.refetch(),
      summary.refetch(),
      cycle.refetch(),
      suggestions.refetch(),
      mood.refetch(),
    ]);
    setRefreshing(false);
  };

  const go = (href: string) => router.navigate(href);
  const firstLoad = profile.isLoading && profile.data === undefined;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ paddingTop: 16 }}
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View className="mx-auto w-full max-w-6xl gap-5 px-5">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-[1.5px]">
              {format(now, 'EEEE, d MMMM', { locale })}
            </Text>
            <Text
              role="heading"
              aria-level={1}
              numberOfLines={2}
              className="mt-1 text-[28px] font-bold leading-9 tracking-tight"
            >
              {firstName
                ? t('home.greeting.named', {
                    greeting: t(greetingKey(now.getHours())),
                    name: firstName,
                  })
                : t(greetingKey(now.getHours()))}
            </Text>
          </View>
          <View
            className="bg-card border-border flex-row items-center gap-1 rounded-full border px-3 py-2"
            aria-label={t('home.week.streak', { count: demo.week.streak_days })}
          >
            <Icon as={Flame} size={16} className="text-accent" />
            <Text className="text-sm font-bold">{demo.week.streak_days}</Text>
          </View>
        </View>

        {firstLoad ? (
          <HomeSkeleton />
        ) : (
          <View className="gap-5">
            {/* Main column */}
            <View className="gap-5">
              <FadeIn>
                <TodayCard
                  summary={summary.data}
                  state={summary.state}
                  onRetry={() => summary.refetch()}
                  onLog={() => go('/food')}
                />
              </FadeIn>
              <FadeIn delay={60}>
                <QuickActions onNavigate={go} />
              </FadeIn>
              <FadeIn delay={120}>
                <NoticedCard
                  insight={demo.noticed}
                  demo
                  onAsk={() =>
                    go(
                      `/chat?q=${encodeURIComponent(t('chat.askAbout', { topic: demo.noticed.body }))}`,
                    )
                  }
                />
              </FadeIn>
              <FadeIn delay={180}>
                <SuggestionsSection
                  data={suggestions.data}
                  noProfile={suggestions.noProfile}
                  notReady={suggestions.notReady}
                  state={suggestions.state}
                  onRetry={() => suggestions.refetch()}
                  onRegenerate={() => suggestions.regenerate.mutate()}
                  regenerating={suggestions.regenerate.isPending}
                  regenerateFailed={suggestions.regenerate.isError}
                />
              </FadeIn>
              <FadeIn delay={240}>
                <RecentLogs
                  logs={demo.recent}
                  demo
                  onSeeAll={() => go('/food')}
                  onLog={() => go('/food')}
                />
              </FadeIn>
            </View>

            {/* Side column */}
            <View className="gap-5">
              <FadeIn delay={120}>
                <Veil hidden={discreet} label={t('home.mood.section')}>
                  <View className="gap-3">
                    <MoodCard
                      entry={mood.entry}
                      waiting={moodWaiting.has(today)}
                      onPick={(value) => go(checkInHref({ mood: value }))}
                      onOpen={() => go('/mood')}
                    />
                    <MoodInsightCard insight={moodInsight} demo />
                  </View>
                </Veil>
              </FadeIn>
              {cycle.data?.enabled ? (
                <FadeIn delay={180}>
                  <Veil hidden={discreet} label={t('home.cycle.title')}>
                    <CyclePreview
                      status={cycle.data}
                      fertilityOptIn={profile.data?.wants_fertility_estimate === true}
                      onOpen={() => go('/cycle')}
                    />
                  </Veil>
                </FadeIn>
              ) : null}
              <FadeIn delay={240}>
                <WeekCard
                  week={demo.week}
                  insights={demo.insights}
                  demo
                  onSeeAll={() => go('/insights')}
                />
              </FadeIn>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
