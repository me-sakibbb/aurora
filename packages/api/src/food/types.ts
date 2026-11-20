import type { KcalRange } from '../home/types';

// Proposed API contract for F5 Food Search, for the backend team. The app already reads these
// shapes where it can (see ./api.ts) and degrades gracefully until they exist.

/**
 * `GET /api/v1/food/recipes?search=` today matches the English `name` only, so Bengali script
 * (ডাল) and Banglish (vat, bhorta) find nothing. Proposed: match `name`, `name_bn`, aliases and
 * phonetic keys, whichever language or mix was typed, ranked by the backend.
 *
 * Proposed extra fields per item: a calorie range (F5) instead of a single per-100 g figure.
 *
 * `thumbnail_url` shipped, but recipes without a photo get a shared placehold.co image. Proposed:
 * send `null` for those (the app filters the placeholder host until then, see `photoUrl`).
 */
export type FoodSearchItemProposal = {
  /** Lower and upper kcal for a typical serving, worked out by the backend. */
  kcal_min: KcalRange['min'];
  kcal_max: KcalRange['max'];
};

/**
 * Proposed query params for `GET /api/v1/food/recipes`, so every food list can scroll forever
 * without loading the whole database. In Supabase terms:
 * `.range(offset, offset + limit - 1)` and `.eq('cooking_method', cooking_method)`.
 * Keep a stable order (e.g. `name`, then `id`) so pages don't overlap.
 */
export type FoodListParamsProposal = {
  /** Rows to skip. Today the param is ignored and every request returns the first page. */
  offset: number;
  limit: number;
  /** Browse one cooking method (one of the recipes table's `cooking_method` values). */
  cooking_method?: string;
};

/**
 * Proposed `POST /api/v1/food/missing`: someone flags a food the search couldn't find.
 * Respond 201 (or 202 when queued for review). The UI is built; submit is disabled until this ships.
 */
export type MissingFoodReport = {
  /** What the person searched for or typed, as written (any language or mix). */
  name: string;
  /** Optional detail: how it's cooked, where it's from, brand… */
  note?: string;
  /** The search text that found nothing, when different from `name`. */
  query?: string;
};

/**
 * Proposed Bengali text for recipe questions. Today `prompt` and choice `label` are one language
 * only, so Bengali mode shows them as written.
 */
export type RecipeQuestionProposal = {
  prompt_bn: string | null;
  choices: { value: string; label: string; label_bn: string | null }[];
};

/**
 * Proposed additions to `POST /api/v1/food/recipes/log`:
 * - `client_id`: a device-made UUID, upserted, so a log replayed after a lost response (offline
 *   queue, F15) never saves twice.
 * - `oil_tier` (`low` | `typical` | `high`) is stored but doesn't change the nutrition yet, and
 *   any string is accepted. Proposed: validate it and apply it to the estimate (F6).
 */
export type FoodLogProposal = {
  client_id: string;
};

// ─── A2 custom recipes: what the backend still needs ─────────────────────────────────────────────

/**
 * Proposed changes to `POST /food/recipes/custom` and `PATCH /food/recipes/{id}`:
 * - `yield_factor` optional, defaulting per `cooking_method` on the server. Today it's required, so
 *   the app asks for the finished weight and sends finished ÷ raw total.
 * - Save `thumbnail_url` as `null` when none is sent, instead of the shared placehold.co image.
 * - Publish the recipe rules the app now mirrors (food/recipe-rules.ts), e.g. `GET /food/cooking-methods`
 *   with `requires_water` per method, so the copy in the app can go.
 * - Errors with a stable `code` (e.g. `water_required`, `ingredient_not_found`) next to the English
 *   `detail`, so the app can explain them in Bengali too.
 */
export type CustomRecipeProposal = {
  yield_factor?: number;
  error_code: 'water_required' | 'ingredient_not_found' | 'duplicate_ingredient';
};

/**
 * Proposed `POST /food/recipes/custom/preview`: the same body, returning the nutrition without
 * saving, so the review step can show it before Save. Today it's only known after saving.
 */
export type CustomRecipePreviewProposal = {
  nutrients: { per_100g: Record<string, number>; total: Record<string, number> };
  weight_g: number;
};

/**
 * Proposed list params for custom recipes and ingredients:
 * - `GET /food/recipes?mine=true&offset=&limit=`: only the signed-in user's recipes, paged. Today
 *   "My recipes" filters the cached catalogue (first 200 by name, catalog and own mixed).
 * - `GET /food/ingredients?offset=` and matching on `name_bn` / aliases, not only English `name_en`.
 * - An `image_url` on `bfct_foods` (and in `GET /food/ingredients` and the recipe detail's
 *   `ingredients[].bfct_foods`), so ingredient rows can show a photo. The app already reads it.
 */
export type MyRecipesParamsProposal = { mine: true; offset: number; limit: number };

/**
 * Proposed for `POST /uploads/file` (shipped in backend 24fdcc8):
 * - adopt the `recipe-photos` bucket migration (created 2026-11-20, docs/sql/recipe_photos_bucket.sql);
 * - accept only listed `bucket_name`s (today any bucket is accepted, including private ones);
 * - accept only JPEG / PNG / WebP and check the file signature, like `/food/log/image` does;
 * - a way to delete a photo that was replaced or never saved with a recipe.
 */
export type UploadProposal = {
  allowed_buckets: string[];
  delete: 'DELETE /uploads/file?url=';
};
