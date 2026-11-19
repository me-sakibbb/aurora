'use client';

import {
  type CalorieInsights,
  type DailySummary,
  fetchCalorieInsights,
  fetchDailySummary,
  fetchLogsBetween,
  fetchMealSuggestions,
  fetchProfile,
  isApiConfigured,
  type MealSuggestions,
  type RecentLog,
  regenerateMealSuggestions,
  suggestionsNotReady,
} from '@mybela/api';
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfDay, subDays } from 'date-fns';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { useDemoHome } from './demo';

export const profileQueryKey = (userId: string | undefined) => ['profile', userId];
/** Today's suggestions; `['meal-suggestions', userId]` is the prefix of every day's set. */
export const mealSuggestionsQueryKey = (userId: string | undefined, date: string) => [
  'meal-suggestions',
  userId,
  date,
];
/** Prefix of every day's summary; invalidate it after a meal is logged. */
export const dailySummaryQueryKey = (userId: string | undefined) => ['daily-summary', userId];

/** Prefix of every day's log list; invalidate it after a meal is logged. */
export const todayLogsQueryKey = (userId: string | undefined) => ['food-logs', userId];

/** Prefix of every calorie-insights range; invalidate it after a meal is logged. */
export const calorieInsightsQueryKey = (userId: string | undefined) => ['calorie-insights', userId];

/** `GET /profile`: target, goals, discreet mode. `null` data = no profile built yet. */
export function useProfile() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: fetchProfile,
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 5 * 60_000,
  });
}

export type SectionState = 'ready' | 'loading' | 'offline' | 'error';

/**
 * What a Home section should render (F15). Cached data always wins, even offline or after a failed
 * refetch, since queries are persisted.
 */
function sectionState(query: UseQueryResult<unknown>, online: boolean): SectionState {
  if (query.data !== undefined) return 'ready';
  if (!online) return 'offline';
  if (query.isError) return 'error';
  return 'loading';
}

/** Today's local date and IANA timezone, so the backend draws the day's boundaries the same way. */
function useLocalDay() {
  const date = format(new Date(), 'yyyy-MM-dd');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';
  return { date, tz };
}

/** `GET /dashboard`: today's target, kcal consumed and logged meal slots (F4). */
export function useDailySummary() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const { date, tz } = useLocalDay();
  const query = useQuery<DailySummary | null>({
    queryKey: [...dailySummaryQueryKey(userId), date, tz],
    queryFn: () => fetchDailySummary({ date, tz }),
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 60_000,
  });
  return { ...query, state: sectionState(query, online) };
}

/**
 * `GET /calories/insights` for the last seven local days, ending today (F4 "This week"): which days
 * have logs and the week's totals. `null` data = no profile yet.
 */
export function useWeekCalories() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const { date, tz } = useLocalDay();
  const startDate = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const query = useQuery<CalorieInsights | null>({
    queryKey: [...calorieInsightsQueryKey(userId), startDate, date, tz],
    queryFn: () => fetchCalorieInsights({ startDate, endDate: date, tz }),
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 60_000,
  });
  return { ...query, state: sectionState(query, online) };
}

/**
 * Today's food logs, newest first, read straight from Supabase (the backend has no GET for logs).
 * The day runs from local midnight to the next.
 */
export function useTodayLogs() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const { date } = useLocalDay();
  const query = useQuery<RecentLog[]>({
    queryKey: [...todayLogsQueryKey(userId), date],
    queryFn: () => {
      const start = startOfDay(new Date());
      return fetchLogsBetween({
        userId: userId as string,
        from: start.toISOString(),
        to: addDays(start, 1).toISOString(),
      });
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  return { ...query, state: sectionState(query, online) };
}

/**
 * `GET /food/suggestions/{user_id}`: today's goal-based suggestions (F18). The backend plans them
 * around the profile's target, so with no profile there's nothing to ask for (`noProfile`).
 */
export function useMealSuggestions() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const { date } = useLocalDay();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const queryKey = mealSuggestionsQueryKey(userId, date);
  const query = useQuery<MealSuggestions>({
    queryKey,
    queryFn: () => fetchMealSuggestions(userId as string),
    enabled: Boolean(userId) && isApiConfigured() && Boolean(profile.data),
    staleTime: 10 * 60_000,
  });
  // "Show me other ideas": the backend plans a fresh set for today.
  const regenerate = useMutation({
    mutationFn: () => regenerateMealSuggestions(userId as string),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const noProfile = profile.data === null;
  // No target yet, or too few recipes fit the person's diet: an honest "not ready" (422), not an error.
  const notReady = query.data === undefined && suggestionsNotReady(query.error);
  const state = sectionState(profile.isError ? profile : query, online);
  return {
    ...query,
    noProfile,
    notReady,
    regenerate,
    state: noProfile || notReady ? ('ready' as const) : state,
  };
}

/**
 * Sections with no backend endpoint yet. Returns sample data, so the dashboard can be designed
 * and reviewed end to end. Swap each field for a query once its endpoint ships.
 */
export function useHomeDemo() {
  return useDemoHome();
}
