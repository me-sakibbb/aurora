'use client';

import {
  ApiError,
  createFoodLog,
  type FoodItem,
  type FoodLog,
  type FoodLogInput,
  fetchRecipe,
  isApiConfigured,
  type PortionNutrients,
  previewRecipeNutrition,
  type RecipeAnswers,
} from '@mybela/api';
import {
  keepPreviousData,
  type Mutation,
  type QueryClient,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useIsOnline } from '../../lib/use-online';
import { calorieInsightsQueryKey, dailySummaryQueryKey, todayLogsQueryKey } from '../home/queries';

// ─── F6 meal slots ──────────────────────────────────────────────────────────────────────────────
// The log only carries `logged_at`; the backend puts it in a slot by local time (breakfast 04–11,
// lunch 11–15, snacks 15–19, dinner 19–04). Picking a slot sends now when now falls in it,
// otherwise a time inside it today, so the log lands where the person put it.

export const MEAL_SLOTS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** [start hour, end hour) and the time used when logging that slot at another time of day. */
const SLOT_HOURS: Record<MealSlot, { from: number; to: number; at: [number, number] }> = {
  breakfast: { from: 4, to: 11, at: [8, 0] },
  lunch: { from: 11, to: 15, at: [13, 0] },
  snacks: { from: 15, to: 19, at: [17, 0] },
  dinner: { from: 19, to: 28, at: [20, 30] },
};

function inSlot(slot: MealSlot, date: Date) {
  const { from, to } = SLOT_HOURS[slot];
  const hour = date.getHours();
  return (hour >= from && hour < to) || (hour + 24 >= from && hour + 24 < to);
}

/** The slot the current time falls in, so the picker starts on the meal most likely being logged. */
export function currentMealSlot(now = new Date()): MealSlot {
  return MEAL_SLOTS.find((slot) => inSlot(slot, now)) ?? 'dinner';
}

/** The `logged_at` to send for a slot picked at `now`. */
export function loggedAtFor(slot: MealSlot, now = new Date()): string {
  if (inSlot(slot, now)) return now.toISOString();
  const [hours, minutes] = SLOT_HOURS[slot].at;
  const at = new Date(now);
  at.setHours(hours, minutes, 0, 0);
  return at.toISOString();
}

// ─── Reads ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The recipe with its current questions, starting from the (possibly older) catalogue copy so the
 * form shows at once; the fresh copy replaces it, so a log isn't sent against outdated questions.
 */
export function useRecipe(item: FoodItem) {
  return useQuery({
    queryKey: ['food', 'recipe', item.id],
    queryFn: ({ signal }) => fetchRecipe(item.id, signal),
    initialData: { ...item, questions: item.questions ?? [] },
    initialDataUpdatedAt: 0,
    enabled: isApiConfigured(),
    staleTime: 5 * 60_000,
  });
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export type EstimateState = 'ready' | 'loading' | 'needsAnswers' | 'offline' | 'error';

/**
 * The backend's nutrition for the portion being logged, refreshed as the portion or answers change
 * (debounced while dragging). Keeps showing the last figures while the next ones load.
 */
export function usePortionEstimate({
  recipeId,
  grams,
  answers,
  complete,
}: {
  recipeId: string;
  grams: number;
  answers: RecipeAnswers;
  /** Every required question answered (the backend rejects the request otherwise). */
  complete: boolean;
}) {
  const online = useIsOnline();
  // Only the portion is debounced (it changes continuously while dragging); answers are taps.
  const debouncedGrams = useDebounced(grams, 250);
  const query = useQuery<PortionNutrients>({
    queryKey: ['food', 'estimate', recipeId, debouncedGrams, answers],
    queryFn: ({ signal }) =>
      previewRecipeNutrition(recipeId, { grams: debouncedGrams, answers }, signal),
    enabled: complete && isApiConfigured(),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  let state: EstimateState;
  if (!complete) state = 'needsAnswers';
  else if (query.data !== undefined) state = 'ready';
  else if (!online) state = 'offline';
  else if (query.isError) state = 'error';
  else state = 'loading';
  return { ...query, state, nutrients: complete ? query.data : undefined };
}

// ─── The log write (F15: must not be lost) ──────────────────────────────────────────────────────
// Registered by key so a log made offline survives an app restart and is sent later (see
// docs/architecture.md).

export const FOOD_LOG = ['food-log', 'create'];

export type FoodLogVars = FoodLogInput & { userId: string };

export function registerFoodMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(FOOD_LOG, {
    mutationFn: async ({ userId: _userId, ...input }: FoodLogVars): Promise<FoodLog | null> => {
      try {
        return await createFoodLog(input);
      } catch (error) {
        // A meal photo can back one log only. A 409 for it means an earlier send (e.g. replayed
        // after going offline) already saved this log, so it isn't an error (no log id returned).
        if (input.image_session_id && error instanceof ApiError && error.status === 409) {
          return null;
        }
        throw error;
      }
    },
    onSettled: (_data, _error, { userId }: FoodLogVars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dailySummaryQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: todayLogsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: calorieInsightsQueryKey(userId) }),
        // Suggestions can mark what's been tried (F18).
        queryClient.invalidateQueries({ queryKey: ['meal-suggestions', userId] }),
      ]),
  });
}

const isFoodLog = (m: Mutation<unknown, Error, unknown>) =>
  m.options.mutationKey?.join() === FOOD_LOG.join();

/**
 * Logs waiting to be sent (offline) and logs that failed for good, with Try again / Discard for
 * the failed ones. A failure keeps everything that was entered, inside the mutation.
 */
export function useFoodLogWrites() {
  const queryClient = useQueryClient();
  const waiting = useMutationState({
    filters: { status: 'pending', predicate: (m) => isFoodLog(m) && m.state.isPaused },
  });
  const failed = useMutationState({
    filters: { status: 'error', predicate: isFoodLog },
    select: (m) => m as Mutation<unknown, Error, unknown>,
  });
  const cache = queryClient.getMutationCache();

  const retry = () => {
    for (const mutation of failed) {
      const variables = mutation.state.variables;
      cache.remove(mutation);
      void cache.build(queryClient, { mutationKey: FOOD_LOG }).execute(variables);
    }
  };
  const dismiss = () => {
    for (const mutation of failed) cache.remove(mutation);
  };

  return { waiting: waiting.length, failed: failed.length, retry, dismiss };
}

export type { FoodLog };
