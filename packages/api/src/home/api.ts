import { z } from 'zod';
import { ApiError, apiFetch } from '../backend';
import { photoUrl } from '../food/api';
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
  /** Decides who is offered cycle tracking before opting in (F13). */
  sex: z.enum(['female', 'male', 'other']).nullish().catch(null),
  /** Opt-in for the estimated fertile window (F11). */
  wants_fertility_estimate: z.boolean().nullish(),
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

export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

const suggestionSchema = z
  .object({
    id: z.string().nullish(),
    meal_slot: z.enum(MEAL_SLOTS),
    recipe_id: z.string().nullish(),
    grams: z.coerce.number(),
    kcal: z.coerce.number(),
    /** The backend's explanation for this pick. Shown in full, as written. */
    reason: z.string().nullish(),
    /** Proposed: the person has logged this food before (F18 "already tried"). */
    tried: z.boolean().nullish(),
    /** Proposed: the backend's "this figure describes the food, not you" wording. */
    note: z.string().nullish(),
    recipes: z
      .object({
        id: z.string(),
        name: z.string(),
        name_bn: z.string().nullish(),
        cooking_method: z.string().nullish(),
        thumbnail_url: z.string().nullish(),
      })
      .nullish(),
  })
  .transform(({ recipes, ...item }) => ({
    ...item,
    tried: item.tried === true,
    note: item.note || null,
    recipes: recipes
      ? {
          id: recipes.id,
          name: recipes.name,
          name_bn: recipes.name_bn || null,
          cooking_method: recipes.cooking_method ?? null,
          image_url: photoUrl(recipes.thumbnail_url),
        }
      : null,
  }));

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };

// A freshly planned day carries the kcal figures; a cached one (asked again the same day) doesn't.
const suggestionsSchema = z
  .object({
    date: z.string().nullish(),
    target_kcal: z.coerce.number().nullish(),
    consumed_kcal: z.coerce.number().nullish(),
    cached: z.boolean().nullish(),
    suggestions: z.array(suggestionSchema),
  })
  .transform(({ suggestions, ...rest }) => ({
    ...rest,
    // The backend sorts slots alphabetically; show them in the order of the day.
    suggestions: [...suggestions].sort((a, b) => SLOT_ORDER[a.meal_slot] - SLOT_ORDER[b.meal_slot]),
  }));

export type MealSuggestion = z.infer<typeof suggestionSchema>;
export type MealSuggestions = z.infer<typeof suggestionsSchema>;

/**
 * The backend can't plan suggestions yet: no calorie target, or not enough recipes fit the
 * person's diet (both 422). Shown as an honest "not ready yet" state, not an error.
 */
export function suggestionsNotReady(error: unknown): boolean {
  return error instanceof ApiError && error.status === 422;
}

/** `GET /api/v1/food/suggestions/{user_id}`: today's goal-based suggestions (F18). */
export async function fetchMealSuggestions(userId: string): Promise<MealSuggestions> {
  const json = await apiFetch(`/food/suggestions/${encodeURIComponent(userId)}`);
  return suggestionsSchema.parse(json);
}

/** `POST /api/v1/food/suggestions/{user_id}/new`: asks the backend for a fresh set for today. */
export async function regenerateMealSuggestions(userId: string): Promise<MealSuggestions> {
  const json = await apiFetch(`/food/suggestions/${encodeURIComponent(userId)}/new`, {
    method: 'POST',
  });
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
