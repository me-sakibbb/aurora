import { z } from 'zod';
import { apiFetch } from '../backend';
import { ageFromBirthYear, type OnboardingDraft } from './draft';
import type {
  ActivityLevel,
  BloodPressure,
  BodyType,
  CookingStyle,
  DietaryPattern,
  Goal,
  HeardFrom,
  OilLevel,
  Sex,
} from './options';

/** Body of `POST /api/v1/onboarding` (mirrors the backend's `OnboardingIn`). */
export type OnboardingPayload = {
  heard_from?: HeardFrom;
  /** In the order picked. */
  goals: Goal[];
  dietary_pattern?: DietaryPattern;
  cooking_style?: CookingStyle;
  oil_percent?: OilLevel;
  sample_meals: { recipe_id: string; grams: number }[];
  sex?: Sex;
  body_type?: BodyType;
  age_years?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  blood_pressure?: BloodPressure;
  has_diabetes?: boolean;
  notifications_enabled?: boolean;
  /** Not a backend field yet (ignored there): the widget opt-in. */
  widget_enabled?: boolean;
};

/** Turns the on-device draft into the request body. */
export function buildOnboardingPayload(draft: OnboardingDraft): OnboardingPayload {
  const payload: OnboardingPayload = {
    heard_from: draft.heardFrom ?? undefined,
    goals: draft.goals,
    dietary_pattern: draft.dietaryPattern,
    cooking_style: draft.cookingStyle,
    oil_percent: draft.oil,
    sample_meals: draft.sampleMeals.map(({ recipeId, grams }) => ({ recipe_id: recipeId, grams })),
    sex: draft.sex,
    body_type: draft.bodyType,
    age_years: draft.birthYear === undefined ? undefined : ageFromBirthYear(draft.birthYear),
    height_cm: draft.heightCm === undefined ? undefined : Math.round(draft.heightCm),
    weight_kg: draft.weightKg,
    activity_level: draft.activityLevel,
    blood_pressure: draft.bloodPressure,
    has_diabetes: draft.hasDiabetes,
    notifications_enabled: draft.notificationsEnabled,
    widget_enabled: draft.widgetEnabled,
  };
  // Drop unanswered fields rather than sending explicit nulls.
  return JSON.parse(JSON.stringify(payload)) as OnboardingPayload;
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<void> {
  await apiFetch('/onboarding', { method: 'POST', body: payload });
}

const sampleRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_bn: z.string().nullish(),
  cooking_method: z.string().nullish(),
  servings: z.number().nullish(),
  weight_g: z.number().nullish(),
});

export type SampleRecipe = z.infer<typeof sampleRecipeSchema>;

/** Used when a recipe has no weight or servings to divide into a portion. */
const FALLBACK_PORTION_G = 100;

/**
 * One serving of a recipe in grams (the recipe's weight split over its servings). This is the
 * portion the sandbox shows and sends; calories for it are worked out by the backend.
 */
export function servingGrams(recipe: Pick<SampleRecipe, 'servings' | 'weight_g'>): number {
  const { servings, weight_g } = recipe;
  if (!servings || !weight_g || servings <= 0 || weight_g <= 0) return FALLBACK_PORTION_G;
  return Math.round(weight_g / servings);
}

/** The preloaded meals for the onboarding sandbox carousel (`GET /api/v1/food/recipes`). */
export async function fetchSampleRecipes(): Promise<SampleRecipe[]> {
  const json = await apiFetch('/food/recipes');
  return z.object({ recipes: z.array(sampleRecipeSchema) }).parse(json).recipes;
}
