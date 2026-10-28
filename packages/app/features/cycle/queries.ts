'use client';

import {
  type CycleAccess,
  type CycleSetupInput,
  type CycleStatus,
  cycleAccess,
  deletePeriod,
  fetchCycleStatus,
  fetchPeriodPage,
  fetchPeriodsBetween,
  isApiConfigured,
  isSupabaseConfigured,
  PERIOD_PAGE_SIZE,
  type Period,
  type Profile,
  saveCycleSetup,
  savePeriod,
  turnOffCycle,
} from '@aurora/api';
import {
  type InfiniteData,
  type Mutation,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { profileQueryKey, useProfile } from '../home/queries';

export const cycleStatusQueryKey = (userId: string | undefined) => ['cycle-status', userId];
/** Prefix of every period query (the history list and each calendar month). */
export const periodsQueryKey = (userId: string | undefined) => ['cycle-periods', userId];
const monthPeriodsKey = (userId: string | undefined) => [...periodsQueryKey(userId), 'month'];

/** `GET /ovulation`: opt-in, settings and the fertile window (F11, F13). */
export function useCycleStatus() {
  const userId = useSession()?.user.id;
  return useQuery<CycleStatus>({
    queryKey: cycleStatusQueryKey(userId),
    queryFn: fetchCycleStatus,
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 5 * 60_000,
  });
}

/** Whether this account sees cycle tracking, is offered it, or neither (F13). */
export function useCycleAccess(): CycleAccess {
  const enabled = useCycleStatus().data?.enabled;
  const sex = useProfile().data?.sex;
  return cycleAccess(enabled, sex);
}

/** The person's periods, newest first, 20 at a time (infinite scroll). */
export function usePeriods({ enabled = true }: { enabled?: boolean } = {}) {
  const userId = useSession()?.user.id;
  return useInfiniteQuery({
    queryKey: periodsQueryKey(userId),
    queryFn: ({ pageParam }) => fetchPeriodPage({ userId: userId as string, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastOffset) =>
      last.length < PERIOD_PAGE_SIZE ? undefined : lastOffset + PERIOD_PAGE_SIZE,
    enabled: enabled && Boolean(userId) && isSupabaseConfigured(),
    staleTime: 60_000,
  });
}

/** Periods overlapping one calendar month (`from`/`to` are its first and last day). */
export function usePeriodsInMonth({ from, to }: { from: string; to: string }) {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: [...monthPeriodsKey(userId), from],
    queryFn: () => fetchPeriodsBetween({ userId: userId as string, from, to }),
    enabled: Boolean(userId) && isSupabaseConfigured(),
    staleTime: 60_000,
  });
}

// ─── Writes that must not be lost (F15) ─────────────────────────────────────────────────────────
// Registered by key so a write made offline survives an app restart and is replayed later (see
// docs/architecture.md). Each also updates the cache right away, so it shows before it syncs.

const SAVE_PERIOD = ['cycle-period', 'save'];
const DELETE_PERIOD = ['cycle-period', 'delete'];
const SAVE_SETUP = ['cycle-settings', 'save'];
const TURN_OFF = ['cycle-settings', 'off'];
const ALL_WRITES = [SAVE_PERIOD, DELETE_PERIOD, SAVE_SETUP, TURN_OFF];

type SavePeriodVars = Period & { userId: string };
type DeletePeriodVars = { id: string; userId: string };
type TurnOffVars = { userId: string };
type PeriodPages = InfiniteData<Period[], number>;

function newestFirst(a: Period, b: Period) {
  return b.started_on.localeCompare(a.started_on);
}

export function registerCycleMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(SAVE_PERIOD, {
    mutationFn: (vars: SavePeriodVars) => savePeriod(vars),
    onMutate: async ({ userId, ...period }: SavePeriodVars) => {
      await queryClient.cancelQueries({ queryKey: periodsQueryKey(userId) });
      queryClient.setQueryData<PeriodPages>(periodsQueryKey(userId), (data) => {
        if (data?.pages.some((page) => page.some((p) => p.id === period.id))) {
          return {
            ...data,
            pages: data.pages.map((page) => page.map((p) => (p.id === period.id ? period : p))),
          };
        }
        const [first = [], ...rest] = data?.pages ?? [];
        return {
          pages: [[period, ...first].sort(newestFirst), ...rest],
          pageParams: data?.pageParams ?? [0],
        };
      });
      // Calendar months: add or replace it (a month only marks the days it contains).
      queryClient.setQueriesData<Period[]>({ queryKey: monthPeriodsKey(userId) }, (periods) =>
        periods ? [period, ...periods.filter((p) => p.id !== period.id)] : periods,
      );
    },
    onSettled: (_data, _error, { userId }: SavePeriodVars) =>
      queryClient.invalidateQueries({ queryKey: periodsQueryKey(userId) }),
  });

  queryClient.setMutationDefaults(DELETE_PERIOD, {
    mutationFn: ({ id }: DeletePeriodVars) => deletePeriod(id),
    onMutate: async ({ id, userId }: DeletePeriodVars) => {
      await queryClient.cancelQueries({ queryKey: periodsQueryKey(userId) });
      queryClient.setQueryData<PeriodPages>(periodsQueryKey(userId), (data) =>
        data ? { ...data, pages: data.pages.map((page) => page.filter((p) => p.id !== id)) } : data,
      );
      queryClient.setQueriesData<Period[]>({ queryKey: monthPeriodsKey(userId) }, (periods) =>
        periods?.filter((p) => p.id !== id),
      );
    },
    onSettled: (_data, _error, { userId }: DeletePeriodVars) =>
      queryClient.invalidateQueries({ queryKey: periodsQueryKey(userId) }),
  });

  queryClient.setMutationDefaults(SAVE_SETUP, {
    mutationFn: (vars: CycleSetupInput) => saveCycleSetup(vars),
    onMutate: async (vars: CycleSetupInput) => {
      await queryClient.cancelQueries({ queryKey: cycleStatusQueryKey(vars.userId) });
      queryClient.setQueryData<CycleStatus>(cycleStatusQueryKey(vars.userId), (status) => ({
        fertility_window: status?.fertility_window,
        enabled: true,
        ovulation: {
          ...status?.ovulation,
          last_period_start: vars.lastPeriodStart,
          last_period_unknown: vars.lastPeriodStart === null,
          cycle_length_days: vars.cycleLengthDays,
          discreet_mode: vars.discreetMode,
        },
      }));
      if (vars.fertilityEstimate !== undefined) {
        queryClient.setQueryData<Profile | null>(profileQueryKey(vars.userId), (profile) =>
          profile ? { ...profile, wants_fertility_estimate: vars.fertilityEstimate } : profile,
        );
      }
    },
    onSettled: (_data, _error, { userId }: CycleSetupInput) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: cycleStatusQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
      ]),
  });

  queryClient.setMutationDefaults(TURN_OFF, {
    mutationFn: (_vars: TurnOffVars) => turnOffCycle(),
    onMutate: async ({ userId }: TurnOffVars) => {
      await queryClient.cancelQueries({ queryKey: cycleStatusQueryKey(userId) });
      queryClient.setQueryData<CycleStatus>(cycleStatusQueryKey(userId), (status) => ({
        enabled: false,
        ovulation: status?.ovulation,
        fertility_window: null,
      }));
    },
    onSettled: (_data, _error, { userId }: TurnOffVars) =>
      queryClient.invalidateQueries({ queryKey: cycleStatusQueryKey(userId) }),
  });
}

export const useSavePeriod = () =>
  useMutation<void, Error, SavePeriodVars>({ mutationKey: SAVE_PERIOD });
export const useDeletePeriod = () =>
  useMutation<void, Error, DeletePeriodVars>({ mutationKey: DELETE_PERIOD });
export const useSaveCycleSetup = () =>
  useMutation<void, Error, CycleSetupInput>({ mutationKey: SAVE_SETUP });
export const useTurnOffCycle = () =>
  useMutation<void, Error, TurnOffVars>({ mutationKey: TURN_OFF });

/**
 * Cycle writes that failed for good (retries used up while online), so the screen can say so and
 * offer to try again with exactly what was entered (F15). Trying again replaces the failed write.
 */
export function useFailedCycleWrites() {
  const queryClient = useQueryClient();
  const failed = useMutationState({
    filters: {
      status: 'error',
      predicate: (m) => ALL_WRITES.some((key) => key.join() === m.options.mutationKey?.join()),
    },
    select: (m) => m as Mutation<unknown, Error, unknown>,
  });
  const cache = queryClient.getMutationCache();

  const retry = () => {
    for (const mutation of failed) {
      const { mutationKey } = mutation.options;
      const variables = mutation.state.variables;
      cache.remove(mutation);
      if (mutationKey) void cache.build(queryClient, { mutationKey }).execute(variables);
    }
  };
  const dismiss = () => {
    for (const mutation of failed) cache.remove(mutation);
    void queryClient.invalidateQueries({ queryKey: ['cycle-periods'] });
    void queryClient.invalidateQueries({ queryKey: ['cycle-status'] });
  };

  return { count: failed.length, retry, dismiss };
}
