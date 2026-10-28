'use client';

import { periodOn } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, Flower2, Icon, Text, WifiOff } from '@aurora/ui';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Skeleton } from '../../components/skeleton';
import { useAppRouter } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { InlineState, Panel } from '../home/components/primitives';
import { useProfile } from '../home/queries';
import { useSheets } from '../shell/sheets';
import {
  DayDetails,
  FertileWindowCard,
  HistoryEmpty,
  PeriodRow,
  PhaseCard,
  TodayCard,
} from './components/cards';
import { CycleCalendar } from './components/cycle-calendar';
import { PeriodSheet, type PeriodSheetMode } from './components/period-sheet';
import { today as todayIso } from './components/setup-fields';
import { SetupFlow } from './components/setup-flow';
import { DEMO_PHASE } from './demo';
import {
  useCycleAccess,
  useCycleStatus,
  useFailedCycleWrites,
  usePeriods,
  usePeriodsInMonth,
} from './queries';

/**
 * F10 Cycle tab. Opted-in accounts get their period, phase, fertile window (F11) and history;
 * accounts it's offered to get the setup questions first; everyone else is told it isn't
 * available (F13: the tab is hidden for them, but the address can still be opened).
 */
export function CycleScreen() {
  const access = useCycleAccess();
  const status = useCycleStatus();
  const profile = useProfile();
  const failed = useFailedCycleWrites();

  // Visibility depends on both answers; until they're in, show loading or why they're missing.
  const unknown =
    status.data === undefined || (status.data.enabled === false && profile.data === undefined);
  if (unknown) {
    const failedToLoad = status.isError || profile.isError;
    return failedToLoad ? (
      <Centered>
        <InlineState
          kind="error"
          onRetry={() => Promise.all([status.refetch(), profile.refetch()])}
        />
      </Centered>
    ) : (
      <CycleSkeleton />
    );
  }

  if (access === 'hidden') return <NotAvailable />;
  if (access === 'eligible') {
    return <SetupFlow failed={failed.count > 0} onClearFailed={failed.dismiss} />;
  }
  return <CycleHome />;
}

function CycleHome() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const showSheet = useSheets((s) => s.show);
  const status = useCycleStatus();
  const profile = useProfile();
  const periods = usePeriods();
  const failed = useFailedCycleWrites();
  const [sheet, setSheet] = useState<PeriodSheetMode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = todayIso();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(today);

  const items = periods.data?.pages.flat() ?? [];
  const firstLoad = periods.data === undefined && !periods.isError;
  const fertileWindow = status.data?.fertility_window;

  // The calendar month's periods (shared cache with the calendar) plus the history list.
  const monthPeriods = usePeriodsInMonth({
    from: format(month, 'yyyy-MM-dd'),
    to: format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd'),
  });
  const known = useMemo(() => {
    const byId = new Map(items.map((p) => [p.id, p]));
    for (const p of monthPeriods.data ?? []) if (!byId.has(p.id)) byId.set(p.id, p);
    return [...byId.values()];
  }, [items, monthPeriods.data]);
  const selectedPeriod = periodOn(known, selected, today);

  const changeMonth = (next: Date) => {
    setMonth(next);
    // Keep the selection on the month being looked at.
    if (!isSameMonth(parseISO(selected), next)) {
      setSelected(isSameMonth(new Date(), next) ? today : format(next, 'yyyy-MM-dd'));
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([status.refetch(), profile.refetch(), periods.refetch()]);
    setRefreshing(false);
  };

  const header = (
    <View className="gap-5 pb-3">
      {!online ? (
        <FadeIn className="bg-muted flex-row items-center gap-3 rounded-2xl px-4 py-3">
          <Icon as={WifiOff} size={18} className="text-muted-foreground" />
          <Text className="text-muted-foreground flex-1 text-sm" role="status">
            {t('cycle.offline')}
          </Text>
        </FadeIn>
      ) : null}

      {failed.count > 0 ? (
        <FadeIn className="bg-destructive/10 gap-3 rounded-2xl px-4 py-3">
          <Text className="text-destructive" role="alert">
            {t('cycle.saveFailed')}
          </Text>
          <View className="flex-row gap-2">
            <Button size="sm" className="rounded-full" onPress={failed.retry}>
              <Text>{t('common.retry')}</Text>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onPress={failed.dismiss}>
              <Text>{t('cycle.discard')}</Text>
            </Button>
          </View>
        </FadeIn>
      ) : null}

      <View className="gap-5 lg:flex-row lg:items-start">
        {/* Main column: today and the calendar */}
        <View className="gap-5 lg:min-w-0 lg:flex-[3]">
          {firstLoad ? (
            <Skeleton className="h-36 rounded-3xl" />
          ) : periods.isError && items.length === 0 ? (
            <InlineState kind={online ? 'error' : 'offline'} onRetry={() => periods.refetch()} />
          ) : (
            <FadeIn>
              <TodayCard
                today={today}
                latest={items[0]}
                onStart={() => setSheet({ kind: 'start' })}
                onEnd={(period) => setSheet({ kind: 'end', period })}
              />
            </FadeIn>
          )}
          <FadeIn delay={60}>
            <Panel className="gap-4">
              <CycleCalendar
                month={month}
                onMonthChange={changeMonth}
                selected={selected}
                onSelect={setSelected}
                today={today}
                fertileWindow={fertileWindow}
              />
              <DayDetails
                day={selected}
                today={today}
                period={selectedPeriod}
                fertile={Boolean(
                  fertileWindow && selected >= fertileWindow.start && selected <= fertileWindow.end,
                )}
                onLogStart={(date) => setSheet({ kind: 'start', date })}
                onEdit={(period) => setSheet({ kind: 'edit', period })}
              />
            </Panel>
          </FadeIn>
        </View>

        {/* Side column: phase and fertile window */}
        <View className="gap-5 lg:min-w-0 lg:flex-[2]">
          <FadeIn delay={120}>
            <PhaseCard phase={DEMO_PHASE} demo />
          </FadeIn>
          <FadeIn delay={180}>
            <FertileWindowCard
              window={fertileWindow}
              optedIn={profile.data?.wants_fertility_estimate === true}
              canOptIn={Boolean(profile.data)}
              onSettings={() => showSheet('cycleSettings')}
            />
          </FadeIn>
        </View>
      </View>

      <Text role="heading" aria-level={2} className="mt-2 px-1 text-lg font-semibold">
        {t('cycle.history.title')}
      </Text>
    </View>
  );

  let footer: React.ReactElement | null = null;
  if (periods.isFetchingNextPage || periods.hasNextPage) {
    footer = (
      <View aria-busy aria-label={t('common.loading')} className="items-center py-6">
        <ActivityIndicator className="text-muted-foreground" />
      </View>
    );
  } else if (items.length > 0) {
    footer = (
      <View className="flex-row items-center gap-3 px-6 py-6" aria-hidden>
        <View className="bg-border h-px flex-1" />
        <Text className="text-muted-foreground text-xs">{t('cycle.history.end')}</Text>
        <View className="bg-border h-px flex-1" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        className="bg-background flex-1"
        contentContainerClassName="mx-auto w-full max-w-6xl px-5 pb-10 lg:px-10 lg:pt-6"
        contentContainerStyle={{ paddingTop: 16 }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PeriodRow period={item} onPress={() => setSheet({ kind: 'edit', period: item })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={firstLoad || periods.isError ? null : <HistoryEmpty />}
        ListFooterComponent={footer}
        onEndReached={periods.hasNextPage ? () => void periods.fetchNextPage() : undefined}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      />
      <PeriodSheet mode={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-background flex-1 justify-center px-6">
      <View className="mx-auto w-full max-w-md">{children}</View>
    </View>
  );
}

function CycleSkeleton() {
  return (
    <View aria-busy className="bg-background flex-1 px-5 lg:px-10" style={{ paddingTop: 16 }}>
      <View className="mx-auto w-full max-w-6xl gap-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-44 rounded-[28px]" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </View>
    </View>
  );
}

/** Someone without cycle tracking opened `/cycle` directly. */
function NotAvailable() {
  const { t } = useTranslation();
  const router = useAppRouter();
  return (
    <Centered>
      <View className="items-center gap-4">
        <View className="bg-muted h-16 w-16 items-center justify-center rounded-3xl">
          <Icon as={Flower2} size={28} className="text-muted-foreground" />
        </View>
        <Text variant="h3" className="text-center">
          {t('cycle.unavailable.title')}
        </Text>
        <Text className="text-muted-foreground text-center leading-6">
          {t('cycle.unavailable.body')}
        </Text>
        <Button variant="outline" className="rounded-full" onPress={() => router.navigate('/')}>
          <Text>{t('placeholders.backHome')}</Text>
        </Button>
      </View>
    </Centered>
  );
}
