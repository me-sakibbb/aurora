import { z } from 'zod';
import { ApiError, apiFetch } from '../backend';
import { GOALS } from '../onboarding/options';

// Live FastAPI endpoints behind the Home dashboard (F4). Every figure is displayed as returned.

const profileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  goals: z
    .array(z.string())
    .nullish()
    .transform((goals) => (goals ?? []).filter((g) => (GOALS as readonly string[]).includes(g))),
  target_kcal: z.coerce.number().nullish(),
  discreet_mode: z.boolean().nullish(),
});

export type Profile = z.infer<typeof profileSchema> & { goals: (typeof GOALS)[number][] };

/**
 * `GET /api/v1/profile`. `null` when the backend has no profile yet (it's only built once the
 * onboarding body measurements were answered).
 */
export async function fetchProfile(): Promise<Profile | null> {
  try {
    return profileSchema.parse(await apiFetch('/profile')) as Profile;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

const fertileWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  confidence: z.string().nullish(),
  /** Explanatory wording written by the backend. Shown in full when present. */
  note: z.string().nullish(),
});

const cycleStatusSchema = z.object({
  enabled: z.boolean(),
  fertility_window: fertileWindowSchema.nullish(),
});

export type FertileWindow = z.infer<typeof fertileWindowSchema>;
export type CycleStatus = z.infer<typeof cycleStatusSchema>;

/**
 * `GET /api/v1/ovulation`. `enabled` decides whether the cycle preview and Cycle tab exist at all
 * (F13). Only the window's start and end are kept: the app never shows a single predicted day (F11).
 */
export async function fetchCycleStatus(): Promise<CycleStatus> {
  return cycleStatusSchema.parse(await apiFetch('/ovulation'));
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

const suggestionSchema = z.object({
  meal_slot: z.enum(MEAL_SLOTS),
  grams: z.coerce.number(),
  kcal: z.coerce.number(),
  reason: z.string().nullish(),
  recipes: z.object({ id: z.string(), name: z.string(), name_bn: z.string().nullish() }).nullish(),
});

const suggestionsSchema = z.object({
  date: z.string(),
  suggestions: z.array(suggestionSchema),
});

export type MealSuggestion = z.infer<typeof suggestionSchema>;
export type MealSuggestions = z.infer<typeof suggestionsSchema>;

/** `GET /api/v1/food/suggestions/{user_id}`: today's goal-based suggestions (F18). */
export async function fetchMealSuggestions(userId: string): Promise<MealSuggestions> {
  const json = await apiFetch(`/food/suggestions/${encodeURIComponent(userId)}`);
  return suggestionsSchema.parse(json);
}

const dashboardSchema = z
  .object({
    date: z.string(),
    timezone: z.string(),
    target_kcal: z.coerce.number().nullish(),
    consumed_kcal: z.coerce.number(),
    // The backend names the slot `snacks`; everywhere else (suggestions, i18n) it's `snack`.
    meals: z.object({
      breakfast: z.boolean(),
      lunch: z.boolean(),
      snacks: z.boolean(),
      dinner: z.boolean(),
    }),
  })
  .transform(({ meals, target_kcal, ...rest }) => ({
    ...rest,
    target_kcal: target_kcal ?? null,
    meals: MEAL_SLOTS.map((slot) => ({
      slot,
      logged: slot === 'snack' ? meals.snacks : meals[slot],
    })),
  }));

export type DailySummary = z.infer<typeof dashboardSchema>;

/**
 * `GET /api/v1/dashboard`: the day at a glance (F4) — target, kcal consumed and which meal slots
 * have a log, all worked out by the backend for the local day in `tz`. `null` when there's no
 * profile yet (404).
 */
export async function fetchDailySummary({
  date,
  tz,
}: {
  date: string;
  tz: string;
}): Promise<DailySummary | null> {
  const params = new URLSearchParams({ date, tz });
  try {
    return dashboardSchema.parse(await apiFetch(`/dashboard?${params}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
