'use client';

import {
  type CycleStatus,
  type DailySummary,
  fetchCycleStatus,
  fetchDailySummary,
  fetchMealSuggestions,
  fetchProfile,
  isApiConfigured,
  type MealSuggestions,
} from '@aurora/api';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { useDemoHome } from './demo';

export const profileQueryKey = (userId: string | undefined) => ['profile', userId];
export const cycleStatusQueryKey = (userId: string | undefined) => ['cycle-status', userId];
/** Prefix of every day's summary; invalidate it after a meal is logged. */
export const dailySummaryQueryKey = (userId: string | undefined) => ['daily-summary', userId];

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

/** `GET /ovulation`: whether cycle content exists for this account at all (F13). */
export function useCycleStatus() {
  const userId = useSession()?.user.id;
  return useQuery<CycleStatus>({
    queryKey: cycleStatusQueryKey(userId),
    queryFn: fetchCycleStatus,
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 5 * 60_000,
  });
}

/** True only when the backend says the account opted in. Unknown (loading/error) → hidden. */
export function useCycleVisible() {
  return useCycleStatus().data?.enabled === true;
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
 * `GET /food/suggestions/{user_id}`: today's goal-based suggestions (F18). The backend plans them
 * around the profile's target, so with no profile there's nothing to ask for (`noProfile`).
 */
export function useMealSuggestions() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const { date } = useLocalDay();
  const profile = useProfile();
  const query = useQuery<MealSuggestions>({
    queryKey: ['meal-suggestions', userId, date],
    queryFn: () => fetchMealSuggestions(userId as string),
    enabled: Boolean(userId) && isApiConfigured() && Boolean(profile.data),
    staleTime: 10 * 60_000,
  });
  const noProfile = profile.data === null;
  const state = sectionState(profile.isError ? profile : query, online);
  return { ...query, noProfile, state: noProfile ? ('ready' as const) : state };
}

/**
 * Sections with no backend endpoint yet. Returns sample data, so the dashboard can be designed
 * and reviewed end to end. Swap each field for a query once its endpoint ships.
 */
export function useHomeDemo() {
  return useDemoHome();
}
