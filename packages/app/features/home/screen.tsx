'use client';

import { useTranslation } from '@aurora/i18n';
import { Flame, Icon, Text, WifiOff } from '@aurora/ui';
import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useInsets } from '../../lib/insets';
import { useAppRouter } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { Avatar, useAccount } from '../shell/account';
import { useSheets } from '../shell/sheets';
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
import { useCycleStatus, useHomeDemo, useMealSuggestions, useProfile } from './queries';
import { useDateLocale } from './use-date-locale';

/** Greeting by local time of day (wording only; nothing health-related is derived). */
function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 17) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

/**
 * F4 Home dashboard: the day at a glance, quick ways into food / mood / chat, Aurora's
 * observation, the week, suggestions and today's log. Wide screens get two columns.
 *
 * Live data: profile (target, goals, discreet mode), cycle status, meal suggestions. Sections
 * without a backend endpoint yet show sample data marked "Preview" (see ./demo.ts).
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useInsets();
  const router = useAppRouter();
  const online = useIsOnline();
  const locale = useDateLocale();
  const showSheet = useSheets((s) => s.show);
  const { firstName } = useAccount();

  const profile = useProfile();
  const cycle = useCycleStatus();
  const suggestions = useMealSuggestions();
  const demo = useHomeDemo();
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const discreet = profile.data?.discreet_mode === true;
  // The real target from the profile wins over the sample one.
  const summary = {
    ...demo.summary,
    target_kcal: profile.data?.target_kcal ?? demo.summary.target_kcal,
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([profile.refetch(), cycle.refetch(), suggestions.refetch()]);
    setRefreshing(false);
  };

  const go = (href: string) => router.navigate(href);
  const firstLoad = profile.isLoading && profile.data === undefined;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View className="mx-auto w-full max-w-6xl gap-5 px-5 lg:px-10 lg:pt-6">
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
              className="mt-1 text-[28px] font-bold leading-9 tracking-tight lg:text-4xl lg:leading-[44px]"
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
          <Pressable
            onPress={() => showSheet('profile')}
            aria-label={t('shell.openProfile')}
            className="rounded-full active:opacity-80 lg:hidden"
          >
            <Avatar />
          </Pressable>
        </View>

        {!online ? (
          <FadeIn className="bg-muted flex-row items-center gap-3 rounded-2xl px-4 py-3">
            <Icon as={WifiOff} size={18} className="text-muted-foreground" />
            <Text className="text-muted-foreground flex-1 text-sm" role="status">
              {t('home.offlineBanner')}
            </Text>
          </FadeIn>
        ) : null}

        {firstLoad ? (
          <HomeSkeleton />
        ) : (
          <View className="gap-5 lg:flex-row lg:items-start lg:gap-6">
            {/* Main column */}
            <View className="gap-5 lg:min-w-0 lg:flex-[3]">
              <FadeIn>
                <TodayCard summary={summary} demo onLog={() => go('/food')} />
              </FadeIn>
              <FadeIn delay={60}>
                <QuickActions onNavigate={go} />
              </FadeIn>
              <FadeIn delay={120}>
                <NoticedCard insight={demo.noticed} demo onAsk={() => go('/chat')} />
              </FadeIn>
              <FadeIn delay={180}>
                <SuggestionsSection
                  result={suggestions.result}
                  state={suggestions.state}
                  onOpen={() => go('/food')}
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
            <View className="gap-5 lg:min-w-0 lg:flex-[2]">
              <FadeIn delay={120}>
                <Veil hidden={discreet} label={t('home.mood.section')}>
                  <MoodCard mood={demo.mood} demo onPick={(value) => go(`/mood?mood=${value}`)} />
                </Veil>
              </FadeIn>
              {cycle.data?.enabled ? (
                <FadeIn delay={180}>
                  <Veil hidden={discreet} label={t('home.cycle.title')}>
                    <CyclePreview status={cycle.data} onOpen={() => go('/cycle')} />
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
