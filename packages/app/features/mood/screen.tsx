'use client';

import type { MoodLevel } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Icon, Plus, Smile, Text } from '@mybela/ui';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Skeleton } from '../../components/skeleton';
import { useAppRouter } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { InlineState, Panel } from '../home/components/primitives';
import { useDateLocale } from '../home/use-date-locale';
import { AppTopBar } from '../shell/top-bar';
import { EntryDetails, EntryRow, TodayPanel } from './components/entry';
import { MoodCalendar } from './components/mood-calendar';
import { checkInHref } from './links';
import {
  todayIso,
  useFailedMoodSaves,
  useMoodDay,
  useMoodHistory,
  useWaitingMoodDays,
} from './queries';

/**
 * F12 Mood: today's check-in (or a prompt to do it), the month with each day's face, and every
 * past check-in (infinite). Any day up to today can be opened and checked in or edited.
 */
export function MoodScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const online = useIsOnline();
  const today = todayIso();
  const todayEntry = useMoodDay(today);
  const history = useMoodHistory();
  const waiting = useWaitingMoodDays();
  const failed = useFailedMoodSaves();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(today);
  const [refreshing, setRefreshing] = useState(false);

  const items = history.data?.pages.flat() ?? [];
  // Offline with nothing saved on the device yet: say so instead of loading forever.
  const offlineEmpty = history.data === undefined && !online;
  const firstLoad = history.data === undefined && !history.isError && !offlineEmpty;
  const open = (day?: string, mood?: MoodLevel) =>
    router.push(checkInHref({ day: day === today ? undefined : day, mood }));

  const changeMonth = (next: Date) => {
    setMonth(next);
    if (!isSameMonth(parseISO(selected), next)) {
      setSelected(isSameMonth(new Date(), next) ? today : format(next, 'yyyy-MM-dd'));
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([todayEntry.refetch(), history.refetch()]);
    setRefreshing(false);
  };

  const header = (
    <View className="gap-5 pb-3">
      {failed.count > 0 ? (
        <FadeIn className="bg-destructive/10 gap-3 rounded-2xl px-4 py-3">
          <Text className="text-destructive" role="alert">
            {t('mood.screen.saveFailed')}
          </Text>
          <View className="flex-row gap-2">
            <Button size="sm" className="rounded-full" onPress={failed.retry}>
              <Text>{t('common.retry')}</Text>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onPress={failed.dismiss}>
              <Text>{t('mood.screen.discard')}</Text>
            </Button>
          </View>
        </FadeIn>
      ) : null}

      <View className="gap-5">
        <View className="gap-5">
          {todayEntry.entry === undefined && (todayEntry.isError || !online) ? (
            <InlineState
              kind={online ? undefined : 'offline'}
              error={todayEntry.error}
              onRetry={() => todayEntry.refetch()}
            />
          ) : todayEntry.entry === undefined ? (
            <Skeleton className="h-52 rounded-[28px]" />
          ) : (
            <FadeIn>
              <TodayPanel
                entry={todayEntry.entry}
                waiting={waiting.has(today)}
                onStart={(mood) => open(today, mood)}
              />
            </FadeIn>
          )}
        </View>

        <View className="gap-5">
          <FadeIn delay={60}>
            <Panel className="gap-4">
              <MoodCalendar
                month={month}
                onMonthChange={changeMonth}
                selected={selected}
                onSelect={setSelected}
                today={today}
              />
              {selected !== today ? (
                <DayDetails
                  day={selected}
                  waiting={waiting.has(selected)}
                  onOpen={() => open(selected)}
                />
              ) : null}
            </Panel>
          </FadeIn>
        </View>
      </View>

      <Text role="heading" aria-level={2} className="mt-2 px-1 text-lg font-bold tracking-tight">
        {t('mood.screen.historyTitle')}
      </Text>
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (firstLoad) {
    empty = (
      <View className="gap-2.5" aria-busy>
        <Skeleton className="h-[72px] rounded-3xl" />
        <Skeleton className="h-[72px] rounded-3xl" />
        <Skeleton className="h-[72px] rounded-3xl" />
      </View>
    );
  } else if (offlineEmpty) {
    empty = <InlineState kind="offline" />;
  } else if (history.isError) {
    empty = <InlineState error={history.error} onRetry={() => history.refetch()} />;
  } else {
    empty = (
      <Panel className="items-center gap-3 py-8">
        <View className="bg-secondary/40 h-14 w-14 items-center justify-center rounded-[20px]">
          <Icon as={Smile} size={26} strokeWidth={1.75} className="text-olive" />
        </View>
        <Text className="text-center font-semibold">{t('mood.screen.emptyTitle')}</Text>
        <Text className="text-muted-foreground max-w-sm text-center leading-6">
          {t('mood.screen.emptyBody')}
        </Text>
      </Panel>
    );
  }

  let footer: React.ReactElement | null = null;
  if (history.isFetchingNextPage || history.hasNextPage) {
    footer = (
      <View aria-busy aria-label={t('common.loading')} className="items-center py-6">
        <ActivityIndicator className="text-muted-foreground" />
      </View>
    );
  } else if (history.isFetchNextPageError) {
    footer = (
      <View className="items-center py-4">
        <InlineState error={history.error} onRetry={() => history.fetchNextPage()} />
      </View>
    );
  } else if (items.length > 0) {
    footer = (
      <View className="flex-row items-center gap-3 px-6 py-6" aria-hidden>
        <View className="bg-border h-px flex-1" />
        <Text className="text-muted-foreground text-xs">{t('mood.screen.historyEnd')}</Text>
        <View className="bg-border h-px flex-1" />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <AppTopBar back />
      <FlatList
        className="flex-1"
        // Phone-first: one column at phone width on every screen size.
        contentContainerClassName="mx-auto w-full max-w-lg px-5 pb-10"
        contentContainerStyle={{ paddingTop: 16 }}
        data={items}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => (
          <EntryRow entry={item} waiting={waiting.has(item.day)} onPress={() => open(item.day)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={
          history.hasNextPage && online && !history.isFetchNextPageError
            ? () => void history.fetchNextPage()
            : undefined
        }
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      />
    </View>
  );
}

/** The calendar's picked day (not today): its check-in, or a way to add one. */
function DayDetails({
  day,
  waiting,
  onOpen,
}: {
  day: string;
  waiting: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const online = useIsOnline();
  const { entry, isError } = useMoodDay(day);

  return (
    <FadeIn key={day} className="border-border gap-4 border-t pt-4">
      <View className="flex-row items-center">
        <Text className="flex-1 font-semibold">
          {format(parseISO(day), 'EEEE, d MMMM', { locale })}
        </Text>
        {entry ? (
          <Button variant="ghost" size="sm" className="-my-1 rounded-full" onPress={onOpen}>
            <Text>{t('mood.screen.edit')}</Text>
          </Button>
        ) : null}
      </View>
      {entry ? (
        <EntryDetails entry={entry} waiting={waiting} />
      ) : entry === null ? (
        <View className="gap-3">
          <Text className="text-muted-foreground">{t('mood.screen.nothingLogged')}</Text>
          <Button variant="outline" className="self-start rounded-full" onPress={onOpen}>
            <Icon as={Plus} size={16} />
            <Text>{t('mood.screen.checkInDay')}</Text>
          </Button>
        </View>
      ) : isError || !online ? (
        <Text className="text-muted-foreground" role="status">
          {online ? t('states.error') : t('states.offline')}
        </Text>
      ) : (
        <Skeleton className="h-16 rounded-2xl" />
      )}
    </FadeIn>
  );
}
