'use client';

import type { Session } from '@mybela/api';
import {
  type AccessStatus,
  type AuthStatus,
  fetchAccessStatus,
  fetchHasOnboarded,
  getSupabase,
  isSupabaseConfigured,
  type OnboardingState,
  signOut,
} from '@mybela/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useRecentFoods } from '../food/queries';
import { useRecipeDrafts } from '../food/recipes/draft-store';
import { useOnboardingDraft } from '../onboarding/draft-store';

type AuthState = { status: AuthStatus; session: Session | null };

/** The current Supabase session, kept in sync by `useAuthListener`. */
export const useAuthStore = create<AuthState>(() => ({ status: 'loading', session: null }));

export const useSession = () => useAuthStore((s) => s.session);

/**
 * Mirrors Supabase's auth state into the store. The session itself persists in SecureStore
 * (native) / localStorage (web) and survives restarts and offline launches.
 * Signing out wipes the query cache, onboarding answers and recent foods, so the next person on a
 * shared phone sees nothing.
 */
export function useAuthListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      useAuthStore.setState({ status: 'signedOut', session: null });
      return;
    }
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      useAuthStore.setState({ status: session ? 'signedIn' : 'signedOut', session });
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        useOnboardingDraft.getState().reset();
        useRecentFoods.getState().clear();
        useRecipeDrafts.getState().clear();
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);
}

/** Onboarding (F2) sets this to `true` after a successful submit so the gate lets the user in. */
export const onboardingQueryKey = (userId: string | undefined) => ['auth', 'onboarded', userId];

/** Whether the signed-in user is new (onboarding pending) or returning. Cached for offline launches. */
export function useOnboardingState(userId: string | undefined) {
  const query = useQuery({
    queryKey: onboardingQueryKey(userId),
    queryFn: () => fetchHasOnboarded(userId as string),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
  const state: OnboardingState =
    query.data === undefined ? 'unknown' : query.data ? 'complete' : 'pending';
  return { state, isError: query.isError && query.data === undefined, retry: query.refetch };
}

/**
 * TEMPORARY beta guard: whether the signed-in user is approved or still pending (see
 * `@mybela/api` auth/access.ts). Cached for offline launches. If it can't be loaded and nothing
 * is cached, the user is let through: this is a UX gate, and approved people must never be locked out.
 */
export function useAccessStatus(userId: string | undefined, email: string | undefined) {
  const query = useQuery({
    queryKey: ['auth', 'access', userId],
    queryFn: () => fetchAccessStatus(email as string),
    enabled: Boolean(userId && email),
    staleTime: 5 * 60_000,
  });
  const status: AccessStatus | 'unknown' =
    query.data ?? (query.isError || !email ? 'approved' : 'unknown');
  return { status, isFetching: query.isFetching, refetch: query.refetch };
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut, networkMode: 'always' });
}
