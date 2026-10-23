import type { KcalRange } from '../home/types';

// Proposed API contract for F5 Food Search, for the backend team. The app already reads these
// shapes where it can (see ./api.ts) and degrades gracefully until they exist.

/**
 * `GET /api/v1/food/recipes?search=` today matches the English `name` only, so Bengali script
 * (ডাল) and Banglish (vat, bhorta) find nothing. Proposed: match `name`, `name_bn`, aliases and
 * phonetic keys, whichever language or mix was typed, ranked by the backend.
 *
 * Proposed extra fields per item: a photo for the result cards, and a calorie range (F5) instead
 * of a single per-100 g figure.
 */
export type FoodSearchItemProposal = {
  /**
   * An absolute https URL to a photo of the dish (landscape, ~4:3, at least 600 px wide; the app
   * crops to fill). Served from a CDN or Supabase Storage public bucket.
   */
  image_url: string | null;
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
