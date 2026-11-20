import { ApiError } from '../backend';

// A2 custom recipes: checks the app makes before saving, so a problem shows on the step where it
// can be fixed instead of after Save.
//
// MIRRORED FROM THE BACKEND (exception to "no business logic in the client", asked for by the user
// on 2026-11-20): aurora-backend app/services/food.py `WATER_REQUIRED_METHODS` + `validate_recipe`.
// The backend still validates every save; if the two ever disagree, its message is shown as
// returned (see `classifyRecipeError`). Proposed in ./types.ts: the backend publishes this rule so
// the copy can go.

/** Cooking methods whose recipes must include added water. */
export const WATER_REQUIRED_METHODS: readonly string[] = [
  'dal',
  'jhol',
  'curry',
  'torkari',
  'polao_biryani',
];

/** Ingredient names the backend accepts as the added-water ingredient (lowercased). */
const WATER_NAMES = ['water', 'water (added)', 'added water'];

/** The ingredient name the app offers when water is missing. */
export const ADDED_WATER_NAME = 'Water (Added)';

export const isAddedWater = (nameEn: string) => WATER_NAMES.includes(nameEn.trim().toLowerCase());

/** True when the recipe's cooking method needs added water and none is in the ingredients. */
export function needsAddedWater(
  method: string | null | undefined,
  ingredients: { name_en: string }[],
): boolean {
  if (!method || !WATER_REQUIRED_METHODS.includes(method)) return false;
  return !ingredients.some((row) => isAddedWater(row.name_en));
}

/** What went wrong saving a recipe, and which editor step can fix it. */
export type RecipeSaveIssue =
  | { kind: 'water'; step: 'ingredients' }
  | { kind: 'missingIngredient'; step: 'ingredients' }
  | { kind: 'duplicateIngredient'; step: 'ingredients' }
  | { kind: 'weight'; step: 'weight' }
  | { kind: 'invalid'; step: null; detail: string }
  | { kind: 'notFound'; step: null }
  | { kind: 'signedOut'; step: null }
  | { kind: 'offline'; step: null }
  | { kind: 'server'; step: null }
  | { kind: 'unknown'; step: null };

/**
 * Sorts a failed save into something the editor can explain and route to a step. The backend's
 * known `detail` texts (food.py `_prepare_recipe` / `validate_recipe`) are matched until it sends
 * stable error codes (proposed in ./types.ts); anything else 4xx is shown as returned.
 */
export function classifyRecipeError(error: unknown): RecipeSaveIssue {
  if (!(error instanceof ApiError)) {
    // fetch() itself failed: no answer from the server.
    return error instanceof TypeError
      ? { kind: 'offline', step: null }
      : { kind: 'unknown', step: null };
  }
  const detail = error.message.toLowerCase();
  if (error.status === 0) return { kind: 'offline', step: null };
  if (error.status === 401 || error.status === 403) return { kind: 'signedOut', step: null };
  if (error.status === 404) return { kind: 'notFound', step: null };
  if (error.status >= 500) return { kind: 'server', step: null };
  if (detail.includes('water-added ingredient')) return { kind: 'water', step: 'ingredients' };
  if (detail.includes('not found in bfct_foods')) {
    return { kind: 'missingIngredient', step: 'ingredients' };
  }
  if (detail.includes('food_ids must be unique')) {
    return { kind: 'duplicateIngredient', step: 'ingredients' };
  }
  if (detail.includes('weight_g') || detail.includes('yield_factor')) {
    return { kind: 'weight', step: 'weight' };
  }
  return { kind: 'invalid', step: null, detail: error.message };
}
