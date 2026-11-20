import { z } from 'zod';
import { ApiError, apiFetch } from '../backend';
import type { KcalRange } from '../home/types';
import type { UploadPart } from '../uploads';

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
    // The list sends `is_custom`; a single recipe sends `owner_id` instead (set only for the
    // signed-in user's own recipes, since other people's are never returned).
    is_custom: z.boolean().nullish(),
    owner_id: z.string().nullish(),
    // Proposed (see ./types.ts): a calorie range per typical serving. Shown instead of the
    // per-100 g figure once the backend sends it.
    kcal_min: z.number().nullish(),
    kcal_max: z.number().nullish(),
    // A single recipe (`GET /food/recipes/{id}`) sends its figures here instead of the list's
    // `kcal_per_100g` / `nutrients_per_100g`; they're used as is when those are missing.
    nutrients: z.object({ per_100g: nutrientsSchema.nullish() }).nullish(),
  })
  .transform(({ kcal_min, kcal_max, thumbnail_url, is_custom, owner_id, nutrients, ...item }) => ({
    ...item,
    kcal_per_100g: item.kcal_per_100g ?? nutrients?.per_100g?.kcal ?? null,
    nutrients_per_100g: item.nutrients_per_100g ?? nutrients?.per_100g ?? null,
    name_bn: item.name_bn || null,
    is_custom: is_custom ?? Boolean(owner_id),
    /** The stored URL as sent (placeholder included), so an edit can send it back unchanged. */
    thumbnail_url: thumbnail_url ?? null,
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
  /** Set when the dish was picked from a meal photo, so the photo is paired with this log. */
  image_session_id?: string;
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

// ─── Snap a meal: photo → recipe match ───────────────────────────────────────────────────────────
// The backend stores the photo, has a vision model rank catalogue recipes, and returns them. The
// person confirms one (or picks another) and the log carries `image_session_id`.

const mealPhotoCandidateSchema = z.object({
  recipe_id: z.string(),
  name: z.string(),
  name_bn: z.string().nullish(),
  cooking_method: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
});

export type MealPhotoCandidate = z.infer<typeof mealPhotoCandidateSchema>;

const mealPhotoMatchSchema = z.object({
  image_session_id: z.string(),
  status: z.string(),
  candidates: z
    .array(mealPhotoCandidateSchema)
    .nullish()
    .transform((list) => list ?? []),
});

export type MealPhotoMatch = z.infer<typeof mealPhotoMatchSchema>;

/** Name of the uploaded meal photo (always a JPEG after compression). */
export const MEAL_PHOTO_FILENAME = 'meal.jpg';

/**
 * `POST /api/v1/food/log/image`: matches a meal photo to catalogue recipes, best first. Pass the
 * `sessionId` from an earlier attempt to retry (a retake or a hint) within the same session.
 */
export async function identifyMealPhoto({
  file,
  sessionId,
  description,
  signal,
}: {
  file: UploadPart;
  sessionId?: string | null;
  /** A hint from the person, e.g. "beef tehari" (backend limit 500 characters). */
  description?: string | null;
  signal?: AbortSignal;
}): Promise<MealPhotoMatch> {
  const form = new FormData();
  if (file instanceof Blob) form.append('image', file, MEAL_PHOTO_FILENAME);
  // RN's FormData takes a file reference object; the DOM typings only know string | Blob.
  else form.append('image', file as unknown as Blob);
  if (sessionId) form.append('session_id', sessionId);
  const hint = description?.trim().slice(0, 500);
  if (hint) form.append('description', hint);
  return mealPhotoMatchSchema.parse(
    await apiFetch('/food/log/image', { method: 'POST', body: form, signal }),
  );
}

/**
 * A match as a food, for showing its card before the full recipe arrives (no serving or nutrition
 * yet, so it isn't enough for the log form; fetch the recipe for that).
 */
export function mealCandidateFood(candidate: MealPhotoCandidate): FoodItem {
  return foodItemSchema.parse({ ...candidate, id: candidate.recipe_id });
}

/** The photo session a failed match left behind (502 sends it), so a retry stays in it. */
export function mealPhotoSessionId(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const detail = error.detail as { image_session_id?: unknown } | null | undefined;
  return typeof detail?.image_session_id === 'string' ? detail.image_session_id : null;
}

// ─── A2 custom recipes ───────────────────────────────────────────────────────────────────────────

const ingredientSchema = z
  .object({
    id: z.string(),
    name_en: z.string(),
    name_bn: z.string().nullish(),
    kcal_per_100g: z.number().nullish(),
    // Proposed (./types.ts): a photo of the ingredient. Rows show an icon until it exists.
    image_url: z.string().nullish(),
  })
  .transform(({ image_url, ...item }) => ({
    ...item,
    name_bn: item.name_bn || null,
    image_url: photoUrl(image_url),
  }));

/** A base food (`bfct_foods`) a recipe is made from. */
export type Ingredient = z.infer<typeof ingredientSchema>;

/** Ingredients per search. The backend has no `offset` yet (see ./types.ts). */
export const INGREDIENT_SEARCH_LIMIT = 50;

/** Ingredients fetched to browse with an empty search box (the backend's maximum). */
export const INGREDIENT_BROWSE_LIMIT = 200;

/**
 * `GET /api/v1/food/ingredients?search=`: base foods whose English name matches, or the first ones
 * by name when `search` is empty (browsing).
 */
export async function searchIngredients(
  search: string,
  signal?: AbortSignal,
  limit = INGREDIENT_SEARCH_LIMIT,
): Promise<Ingredient[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search.trim()) params.set('search', search.trim());
  const json = await apiFetch(`/food/ingredients?${params}`, { signal });
  return z.object({ ingredients: z.array(ingredientSchema) }).parse(json).ingredients;
}

/**
 * One recipe as `GET /food/recipes/{id}` (and the custom create/update calls) return it: its
 * nutrition sits under `nutrients.per_100g` and it lists its ingredients.
 */
const recipeDetailSchema = z
  .object({
    nutrients: z.object({ per_100g: nutrientsSchema.nullish() }).passthrough().nullish(),
    yield_factor: z.number().nullish(),
    ingredients: z
      .array(
        z.object({
          food_id: z.string(),
          edible_g: z.number(),
          bfct_foods: z
            .object({
              name_en: z.string().nullish(),
              name_bn: z.string().nullish(),
              image_url: z.string().nullish(),
            })
            .nullish(),
        }),
      )
      .nullish(),
  })
  .passthrough()
  .transform(({ nutrients, yield_factor, ingredients, ...rest }) => {
    const per100 = nutrients?.per_100g ?? null;
    const item = foodItemSchema.parse({
      ...rest,
      nutrients_per_100g: (rest as { nutrients_per_100g?: unknown }).nutrients_per_100g ?? per100,
      kcal_per_100g: (rest as { kcal_per_100g?: unknown }).kcal_per_100g ?? per100?.kcal ?? null,
    });
    return {
      ...item,
      yield_factor: yield_factor ?? null,
      ingredients: (ingredients ?? []).map((row) => ({
        food_id: row.food_id,
        edible_g: row.edible_g,
        name_en: row.bfct_foods?.name_en ?? '',
        name_bn: row.bfct_foods?.name_bn || null,
        image_url: photoUrl(row.bfct_foods?.image_url),
      })),
    };
  });

export type RecipeDetail = z.infer<typeof recipeDetailSchema>;

/** `GET /api/v1/food/recipes/{id}` with its ingredients, for editing a custom recipe. */
export async function fetchRecipeDetail(id: string, signal?: AbortSignal): Promise<RecipeDetail> {
  return recipeDetailSchema.parse(await apiFetch(`/food/recipes/${id}`, { signal }));
}

/**
 * The body of `POST /food/recipes/custom` and `PATCH /food/recipes/{id}`. The backend works out
 * the nutrition and cooked weight; the app sends what the person entered.
 */
export type CustomRecipeInput = {
  name: string;
  name_bn: string | null;
  cooking_method: string;
  /** A URL from `uploadFile`, or the recipe's current one when editing. */
  thumbnail_url: string | null;
  servings: number;
  /** Finished weight ÷ raw ingredient weight, from the weight the person entered. */
  yield_factor: number;
  ingredients: { food_id: string; edible_g: number }[];
};

/** `POST /api/v1/food/recipes/custom`: saves a private recipe. Returns it with its nutrition. */
export async function createCustomRecipe(input: CustomRecipeInput): Promise<RecipeDetail> {
  return recipeDetailSchema.parse(
    await apiFetch('/food/recipes/custom', { method: 'POST', body: input }),
  );
}

/** `PATCH /api/v1/food/recipes/{id}`: replaces an own recipe. Past logs keep their numbers. */
export async function updateCustomRecipe(
  id: string,
  input: CustomRecipeInput,
): Promise<RecipeDetail> {
  return recipeDetailSchema.parse(
    await apiFetch(`/food/recipes/${id}`, { method: 'PATCH', body: input }),
  );
}

/** `DELETE /api/v1/food/recipes/{id}`. A 409 means it's in the food log and can't be deleted. */
export async function deleteCustomRecipe(id: string): Promise<void> {
  await apiFetch(`/food/recipes/${id}`, { method: 'DELETE' });
}
