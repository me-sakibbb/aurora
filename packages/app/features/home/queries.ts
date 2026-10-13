'use client';

import {
  type CycleStatus,
  fetchCycleStatus,
  fetchMealSuggestions,
  fetchProfile,
  isApiConfigured,
  type MealSuggestions,
} from '@aurora/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { demoSuggestions, useDemoHome } from './demo';

export const profileQueryKey = (userId: string | undefined) => ['profile', userId];
export const cycleStatusQueryKey = (userId: string | undefined) => ['cycle-status', userId];

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

export type WithSource<T> = { data: T; demo: boolean };

/**
 * Today's suggestions (F18). The endpoint exists but can't serve yet (empty recipe table, server
 * error), so while it fails we show sample suggestions, flagged as a preview. Offline with nothing
 * cached is a real offline state instead.
 */
export function useMealSuggestions() {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const today = format(new Date(), 'yyyy-MM-dd');
  const query = useQuery<MealSuggestions>({
    queryKey: ['meal-suggestions', userId, today],
    queryFn: () => fetchMealSuggestions(userId as string),
    enabled: Boolean(userId) && isApiConfigured(),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const fallback = useMemo(() => demoSuggestions(today), [today]);

  let state: 'ready' | 'loading' | 'offline';
  let result: WithSource<MealSuggestions> | null = null;
  if (query.data) {
    state = 'ready';
    result = { data: query.data, demo: false };
  } else if (!online) {
    state = 'offline';
  } else if (query.fetchStatus === 'fetching' && query.failureCount === 0) {
    // First attempt still in flight.
    state = 'loading';
  } else {
    // Failed, retrying, or paused mid-retry (an unfocused tab pauses retries): show the sample.
    state = 'ready';
    result = { data: fallback, demo: true };
  }
  return { ...query, state, result };
}

/**
 * Sections with no backend endpoint yet. Returns sample data, so the dashboard can be designed
 * and reviewed end to end. Swap each field for a query once its endpoint ships.
 */
export function useHomeDemo() {
  return useDemoHome();
}
