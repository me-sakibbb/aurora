import { z } from 'zod';
import { ApiError, apiFetch } from '../backend';
import { photoUrl } from '../food/api';
import {
  ACTIVITY_LEVELS,
  BLOOD_PRESSURES,
  BODY_TYPES,
  DIETARY_PATTERNS,
  GOALS,
  SEXES,
} from '../onboarding/options';
import { getSupabase } from '../supabase';

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
  sex: z.enum(SEXES).nullish().catch(null),
  // Health & goals settings (F3), edited with `PATCH /profile`.
  age_years: z.coerce.number().nullish(),
  height_cm: z.coerce.number().nullish(),
  weight_kg: z.coerce.number().nullish(),
  activity_level: z.enum(ACTIVITY_LEVELS).nullish().catch(null),
  dietary_pattern: z.enum(DIETARY_PATTERNS).nullish().catch(null),
  body_type: z.enum(BODY_TYPES).nullish().catch(null),
  blood_pressure: z.enum(BLOOD_PRESSURES).nullish().catch(null),
  has_diabetes: z.boolean().nullish(),
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

/** What the Health & goals settings can change (F3). Only the fields sent are updated. */
export type ProfileUpdate = Partial<{
  sex: (typeof SEXES)[number];
  age_years: number;
  height_cm: number;
  weight_kg: number;
  activity_level: (typeof ACTIVITY_LEVELS)[number];
  goals: (typeof GOALS)[number][];
  dietary_pattern: (typeof DIETARY_PATTERNS)[number];
  body_type: (typeof BODY_TYPES)[number];
  blood_pressure: (typeof BLOOD_PRESSURES)[number];
  has_diabetes: boolean;
}>;

/**
 * `PATCH /api/v1/profile`: saves the changed answers. The backend recalculates the calorie target
 * when an energy-related answer changes and returns the whole profile (target included).
 */
export async function updateProfile(changes: ProfileUpdate): Promise<Profile> {
  return profileSchema.parse(
    await apiFetch('/profile', { method: 'PATCH', body: changes }),
  ) as Profile;
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

// ─── Today's food logs (F4 "Today's log") ───────────────────────────────────────────────────────
// Read straight from `food_logs` (own-row RLS): the backend has no GET for logs. The kcal figure
// is the one the backend stored in the log's snapshot when it was logged, shown as is.

const RECENT_LOGS_LIMIT = 20;

const recentLogSchema = z
  .object({
    id: z.string(),
    logged_at: z.string(),
    grams: z.coerce.number().nullish(),
    kcal: z.coerce.number().nullish(),
    recipes: z
      .object({
        name: z.string(),
        name_bn: z.string().nullish(),
        thumbnail_url: z.string().nullish(),
      })
      .nullish(),
    bfct_foods: z.object({ name_en: z.string(), name_bn: z.string().nullish() }).nullish(),
  })
  .transform(({ recipes, bfct_foods, ...log }) => ({
    id: log.id,
    logged_at: log.logged_at,
    grams: log.grams ?? null,
    kcal: log.kcal ?? null,
    name: recipes?.name ?? bfct_foods?.name_en ?? null,
    name_bn: (recipes?.name_bn ?? bfct_foods?.name_bn) || null,
    image_url: photoUrl(recipes?.thumbnail_url),
  }));

export type RecentLog = z.infer<typeof recentLogSchema>;

/** The person's logs between two instants (ISO), newest first: the local day on Home. */
export async function fetchLogsBetween({
  userId,
  from,
  to,
}: {
  userId: string;
  from: string;
  to: string;
}): Promise<RecentLog[]> {
  const { data, error } = await getSupabase()
    .from('food_logs')
    .select(
      'id, logged_at, grams, kcal:snapshot->nutrients->kcal, recipes(name, name_bn, thumbnail_url), bfct_foods(name_en, name_bn)',
    )
    .eq('user_id', userId)
    .gte('logged_at', from)
    .lt('logged_at', to)
    .order('logged_at', { ascending: false })
    .limit(RECENT_LOGS_LIMIT);
  if (error) throw error;
  return z.array(recentLogSchema).parse(data);
}

// ─── Calorie insights (F4 "This week") ──────────────────────────────────────────────────────────

const calorieDaySchema = z.object({
  date: z.string(),
  consumed_kcal: z.coerce.number(),
  target_kcal: z.coerce.number().nullish(),
  target_gap_kcal: z.coerce.number().nullish(),
  /** Logs on that day with no kcal figure. */
  unquantified_entries: z.coerce.number().default(0),
});

const calorieInsightsSchema = z.object({
  timezone: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  target_kcal: z.coerce.number().nullish(),
  summary: z.object({
    total_consumed_kcal: z.coerce.number(),
    average_consumed_kcal: z.coerce.number(),
    average_logged_day_kcal: z.coerce.number(),
    days_in_range: z.coerce.number(),
    days_with_logs: z.coerce.number(),
    days_without_logs: z.coerce.number(),
    days_at_or_below_target: z.coerce.number().nullish(),
    target_adherence_pct: z.coerce.number().nullish(),
    days_compared_to_target: z.coerce.number().default(0),
  }),
  daily: z.array(calorieDaySchema),
  /** The backend's written summary of the range (F4 insights summary). Shown as written. */
  observation: z
    .string()
    .nullish()
    .transform((text) => text?.trim() || null),
});

export type CalorieInsights = z.infer<typeof calorieInsightsSchema>;
export type CalorieDay = z.infer<typeof calorieDaySchema>;

/** A day has something logged: kcal counted, or a log without a kcal figure. */
export function dayHasLogs(day: CalorieDay): boolean {
  return day.consumed_kcal > 0 || day.unquantified_entries > 0;
}

/**
 * `GET /api/v1/calories/insights`: kcal per local day against the target, plus the period's
 * totals, all worked out by the backend. `null` when there's no profile yet (404).
 */
export async function fetchCalorieInsights({
  startDate,
  endDate,
  tz,
}: {
  startDate: string;
  endDate: string;
  tz: string;
}): Promise<CalorieInsights | null> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate, tz });
  try {
    return calorieInsightsSchema.parse(await apiFetch(`/calories/insights?${params}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
