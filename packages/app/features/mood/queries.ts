'use client';

import {
  fetchMoodBetween,
  fetchMoodInsight,
  fetchMoodPage,
  isApiConfigured,
  MOOD_PAGE_SIZE,
  type MoodInsight,
  type MoodLog,
  saveMoodLog,
} from '@mybela/api';
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
import { endOfMonth, format, parseISO, startOfMonth, subDays } from 'date-fns';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { sectionState } from '../home/queries';

const ISO = 'yyyy-MM-dd';

/** Prefix of every mood query (each month and the history list). */
export const moodQueryKey = (userId: string | undefined) => ['mood', userId];
const monthKey = (userId: string | undefined, month: string) => [
  ...moodQueryKey(userId),
  'month',
  month,
];
const historyKey = (userId: string | undefined) => [...moodQueryKey(userId), 'history'];

/** `yyyy-MM` of a `yyyy-MM-dd` day. Months are cached by this. */
const monthOf = (day: string) => day.slice(0, 7);

export const todayIso = () => format(new Date(), ISO);

/** Entries in one calendar month, newest first (the calendar, and any one day's entry). */
export function useMoodMonth(month: Date) {
  const userId = useSession()?.user.id;
  const from = format(startOfMonth(month), ISO);
  const to = format(endOfMonth(month), ISO);
  return useQuery<MoodLog[]>({
    queryKey: monthKey(userId, monthOf(from)),
    queryFn: ({ signal }) => fetchMoodBetween({ from, to }, signal),
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 60_000,
  });
}

/** One day's entry (`undefined` while unknown, `null` when nothing was logged that day). */
export function useMoodDay(day: string) {
  const month = useMoodMonth(parseISO(day));
  const entry = month.data ? (month.data.find((log) => log.day === day) ?? null) : undefined;
  return { ...month, entry };
}

/** Every entry, newest first, 20 at a time (infinite scroll). */
export function useMoodHistory() {
  const userId = useSession()?.user.id;
  return useInfiniteQuery({
    queryKey: historyKey(userId),
    queryFn: ({ pageParam, signal }) => fetchMoodPage({ before: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.length < MOOD_PAGE_SIZE ? undefined : last[last.length - 1]?.day,
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 60_000,
  });
}

// ─── The check-in write (F12 + F15: must not be lost) ───────────────────────────────────────────
// Registered by key so a check-in made offline survives an app restart and is sent later (see
// docs/architecture.md). The backend keeps one entry per day, so a replay simply saves it again.
// The cache is updated right away, so the entry shows before it syncs.

export const SAVE_MOOD = ['mood-log', 'save'];

export type SaveMoodVars = MoodLog & { userId: string };
type HistoryPages = InfiniteData<MoodLog[], string | undefined>;

const newestFirst = (a: MoodLog, b: MoodLog) => b.day.localeCompare(a.day);

function withEntry(list: MoodLog[], entry: MoodLog) {
  return [entry, ...list.filter((log) => log.day !== entry.day)].sort(newestFirst);
}

export function registerMoodMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(SAVE_MOOD, {
    mutationFn: ({ userId: _userId, ...entry }: SaveMoodVars) => saveMoodLog(entry),
    onMutate: async ({ userId, ...entry }: SaveMoodVars) => {
      await queryClient.cancelQueries({ queryKey: moodQueryKey(userId) });
      queryClient.setQueryData<MoodLog[]>(monthKey(userId, monthOf(entry.day)), (logs) =>
        withEntry(logs ?? [], entry),
      );
      queryClient.setQueryData<HistoryPages>(historyKey(userId), (data) => {
        if (!data) return data;
        if (data.pages.some((page) => page.some((log) => log.day === entry.day))) {
          return {
            ...data,
            pages: data.pages.map((page) =>
              page.map((log) => (log.day === entry.day ? entry : log)),
            ),
          };
        }
        const [first = [], ...rest] = data.pages;
        return { ...data, pages: [withEntry(first, entry), ...rest] };
      });
    },
    onSettled: (_data, _error, { userId }: SaveMoodVars) =>
      queryClient.invalidateQueries({ queryKey: moodQueryKey(userId) }),
  });
}

export const useSaveMood = () =>
  useMutation<MoodLog, Error, SaveMoodVars>({ mutationKey: SAVE_MOOD });

const isMoodSave = (m: Mutation<unknown, Error, unknown>) =>
  m.options.mutationKey?.join() === SAVE_MOOD.join();

/** Days whose check-in is saved on this device and still waiting to be sent (offline). */
export function useWaitingMoodDays(): Set<string> {
  const days = useMutationState({
    filters: { status: 'pending', predicate: (m) => isMoodSave(m) && m.state.isPaused },
    select: (m) => (m.state.variables as SaveMoodVars | undefined)?.day,
  });
  return new Set(days.filter((day): day is string => Boolean(day)));
}

/**
 * Check-ins that failed for good (retries used up while online), with Try again / Discard. A
 * failure keeps everything that was entered, inside the mutation (F15).
 */
export function useFailedMoodSaves() {
  const queryClient = useQueryClient();
  const failed = useMutationState({
    filters: { status: 'error', predicate: isMoodSave },
    select: (m) => m as Mutation<unknown, Error, unknown>,
  });
  const cache = queryClient.getMutationCache();
  return {
    count: failed.length,
    retry: () => {
      for (const mutation of failed) {
        const variables = mutation.state.variables;
        cache.remove(mutation);
        void cache.build(queryClient, { mutationKey: SAVE_MOOD }).execute(variables);
      }
    },
    dismiss: () => {
      for (const mutation of failed) cache.remove(mutation);
      const userId = (failed[0]?.state.variables as SaveMoodVars | undefined)?.userId;
      // The optimistic entry is gone with the write; show what the server has again.
      void queryClient.invalidateQueries({ queryKey: moodQueryKey(userId) });
    },
  };
}

/** How far back the F17 observation looks: the last 30 local days, including today. */
const INSIGHT_DAYS = 30;

/**
 * `GET /mood/insights` for the last 30 days (F17). Under the mood key, so a saved check-in
 * refreshes it. The backend writes the sentence with a model, so it's kept for a while.
 */
export function useMoodInsight() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const to = todayIso();
  const from = format(subDays(parseISO(to), INSIGHT_DAYS - 1), ISO);
  const query = useQuery<MoodInsight | null>({
    queryKey: [...moodQueryKey(userId), 'insight', from, to],
    queryFn: ({ signal }) => fetchMoodInsight({ from, to }, signal),
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 30 * 60_000,
  });
  return { ...query, state: sectionState(query, online) };
}
