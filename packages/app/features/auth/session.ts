'use client';

import type { Session } from '@aurora/api';
import {
  type AuthStatus,
  fetchHasOnboarded,
  getSupabase,
  isSupabaseConfigured,
  type OnboardingState,
  signOut,
} from '@aurora/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useRecentFoods } from '../food/queries';
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

export function useSignOut() {
  return useMutation({ mutationFn: signOut, networkMode: 'always' });
}
