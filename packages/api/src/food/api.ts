import { z } from 'zod';
import { apiFetch } from '../backend';
import type { KcalRange } from '../home/types';

// F5 Food Search. Every figure is displayed as returned; the backend owns matching and ranking.
// The on-device matcher below only fills the gap while the backend answers (or when offline).

const nutrientsSchema = z.object({
  kcal: z.number().nullish(),
  protein_g: z.number().nullish(),
  fat_g: z.number().nullish(),
  carbs_g: z.number().nullish(),
  fiber_g: z.number().nullish(),
});

/**
 * The backend fills `thumbnail_url` with a shared placeholder image when a recipe has no photo.
 * It's treated as "no photo" so cards keep the cooking-method illustration (backend asked to send
 * `null` instead, see ./types.ts).
 */
const PLACEHOLDER_HOSTS = ['placehold.co'];

/** The photo URL, or `null` for a missing, malformed or placeholder one. */
export function photoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const host = /^https?:\/\/([^/?#]+)/i.exec(url)?.[1]?.toLowerCase();
  if (!host || PLACEHOLDER_HOSTS.some((p) => host === p || host.endsWith(`.${p}`))) return null;
  return url;
}

/**
 * A recipe-specific question asked when logging it (e.g. "How much meat relative to rice?").
 * Prompt and choice labels are shown exactly as returned; how each choice changes the nutrition
 * stays on the backend, the app only sends the chosen `value`.
 */
const recipeQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  required: z
    .boolean()
    .nullish()
    .transform((required) => required ?? true),
  choices: z.array(z.object({ value: z.string(), label: z.string() })),
});

export type RecipeQuestion = z.infer<typeof recipeQuestionSchema>;
/** Question id → chosen choice value. */
export type RecipeAnswers = Record<string, string>;

const foodItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    name_bn: z.string().nullish(),
    cooking_method: z.string().nullish(),
    servings: z.number().nullish(),
    weight_g: z.number().nullish(),
    kcal_per_100g: z.number().nullish(),
    nutrients_per_100g: nutrientsSchema.nullish(),
    // A photo of the dish. Cards show a cooking-method illustration when there's none.
    thumbnail_url: z.string().nullish(),
    questions: z.array(recipeQuestionSchema).nullish(),
    // Proposed (see ./types.ts): a calorie range per typical serving. Shown instead of the
    // per-100 g figure once the backend sends it.
    kcal_min: z.number().nullish(),
    kcal_max: z.number().nullish(),
  })
  .transform(({ kcal_min, kcal_max, thumbnail_url, ...item }) => ({
    ...item,
    name_bn: item.name_bn || null,
    image_url: photoUrl(thumbnail_url),
    questions: item.questions ?? [],
    kcal_range:
      kcal_min != null && kcal_max != null ? ({ min: kcal_min, max: kcal_max } as KcalRange) : null,
  }));

export type FoodItem = z.infer<typeof foodItemSchema>;

const foodListSchema = z.object({ recipes: z.array(foodItemSchema) });

/** Everything searchable, cached on the device so search answers instantly and offline. */
export async function fetchFoodCatalogue(): Promise<FoodItem[]> {
  return foodListSchema.parse(await apiFetch('/food/recipes?limit=200')).recipes;
}

/** Cards per page for every food list. */
export const FOOD_PAGE_SIZE = 20;

/**
 * One page of `GET /api/v1/food/recipes`, in the backend's order: the matches for `search`, or
 * every food (optionally one `cooking_method`) when browsing. `offset` and `cooking_method` are
 * proposed params (./types.ts); until the backend honours them, callers detect it and page
 * through the cached catalogue instead.
 */
export async function fetchFoodPage(
  {
    offset,
    search,
    method,
    limit = FOOD_PAGE_SIZE,
  }: { offset: number; search?: string; method?: string | null; limit?: number },
  signal?: AbortSignal,
): Promise<FoodItem[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search?.trim()) params.set('search', search.trim());
  if (method) params.set('cooking_method', method);
  return foodListSchema.parse(await apiFetch(`/food/recipes?${params}`, { signal })).recipes;
}

/** True when the backend ignored `offset`: the latest page only repeats foods already loaded. */
export function offsetIgnored(pages: FoodItem[][]): boolean {
  if (pages.length < 2) return false;
  const last = pages[pages.length - 1] ?? [];
  const seen = new Set(pages.slice(0, -1).flatMap((page) => page.map((item) => item.id)));
  return last.length > 0 && last.every((item) => seen.has(item.id));
}

/** True when the backend ignored `cooking_method` and sent other kinds of food too. */
export function methodIgnored(page: FoodItem[], method: string | null | undefined): boolean {
  return Boolean(method) && page.some((item) => item.cooking_method !== method);
}

/**
 * Lowercases and strips what people type inconsistently: zero-width joiners (common in Bengali
 * keyboards), punctuation and repeated spaces. Bengali vowel signs are kept.
 */
export function normalizeQuery(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[​-‍﻿]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Instant matches from the cached catalogue: every typed word must appear in the English or
 * Bengali name. Keeps catalogue order (no scoring), so it's a stopgap, not a second ranker.
 */
export function matchCatalogue(items: FoodItem[], query: string): FoodItem[] {
  const tokens = normalizeQuery(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  return items.filter((item) => {
    const haystack = normalizeQuery(`${item.name} ${item.name_bn ?? ''}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

/**
 * Local matches keep their place; the backend's extra matches are appended as they arrive, so
 * rows never jump around under someone's thumb.
 */
export function mergeResults(local: FoodItem[], server: FoodItem[] | undefined): FoodItem[] {
  if (!server?.length) return local;
  const seen = new Set(local.map((item) => item.id));
  return [...local, ...server.filter((item) => !seen.has(item.id))];
}

// ─── F6 logging ──────────────────────────────────────────────────────────────────────────────────

/** `GET /api/v1/food/recipes/{id}`: one recipe with its current questions. */
export async function fetchRecipe(id: string, signal?: AbortSignal): Promise<FoodItem> {
  return foodItemSchema.parse(await apiFetch(`/food/recipes/${id}`, { signal }));
}

const portionNutrientsSchema = z.object({
  kcal: z.number().nullish(),
  protein_g: z.number().nullish(),
  fat_g: z.number().nullish(),
  carbs_g: z.number().nullish(),
  fiber_g: z.number().nullish(),
  iron_mg: z.number().nullish(),
  sodium_mg: z.number().nullish(),
});

export type PortionNutrients = z.infer<typeof portionNutrientsSchema>;

/**
 * `POST /api/v1/food/recipes/{id}/nutrition`: the backend's nutrition for a cooked portion after
 * applying the answers. Missing required or invalid answers are a 422.
 */
export async function previewRecipeNutrition(
  id: string,
  { grams, answers }: { grams: number; answers: RecipeAnswers },
  signal?: AbortSignal,
): Promise<PortionNutrients> {
  const json = await apiFetch(`/food/recipes/${id}/nutrition`, {
    method: 'POST',
    body: { grams, answers },
    signal,
  });
  return z.object({ nutrients: portionNutrientsSchema }).parse(json).nutrients;
}

/** How much cooking oil went in. Sent with the log as `oil_tier`. */
export const OIL_TIERS = ['low', 'typical', 'high'] as const;
export type OilTier = (typeof OIL_TIERS)[number];

export type FoodLogInput = {
  recipe_id: string;
  /** The cooked portion in grams. */
  grams: number;
  oil_tier: OilTier;
  /** ISO timestamp. The backend puts the log in a meal slot by this time. */
  logged_at: string;
  answers: RecipeAnswers;
};

const foodLogSchema = z.object({
  log_id: z.string(),
  recipe_id: z.string(),
  grams: z.number(),
  logged_at: z.string(),
  nutrients: portionNutrientsSchema,
});

export type FoodLog = z.infer<typeof foodLogSchema>;

/** `POST /api/v1/food/recipes/log`: saves a meal. Returns the saved log with its nutrition. */
export async function createFoodLog(input: FoodLogInput): Promise<FoodLog> {
  return foodLogSchema.parse(await apiFetch('/food/recipes/log', { method: 'POST', body: input }));
}
