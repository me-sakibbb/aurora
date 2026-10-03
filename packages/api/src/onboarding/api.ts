import { z } from 'zod';
import { apiFetch } from '../backend';
import { effectiveModules, type OnboardingDraft, tracksCycle } from './draft';
import type {
  ActivityLevel,
  AppModule,
  BloodPressure,
  BodyType,
  Goal,
  HeardFrom,
  OilLevel,
  Sex,
} from './options';

/** Body of `POST /api/v1/onboarding` (mirrors the backend's `OnboardingIn`). */
export type OnboardingPayload = {
  heard_from?: HeardFrom;
  goal?: Goal;
  oil_percent?: OilLevel;
  sample_meals: { recipe_id: string }[];
  modules: AppModule[];
  last_period_start?: string;
  last_period_unknown: boolean;
  cycle_length_days?: number;
  discreet_mode: boolean;
  sex?: Sex;
  body_type?: BodyType;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  blood_pressure?: BloodPressure;
  has_diabetes?: boolean;
  notifications_enabled?: boolean;
  widget_enabled?: boolean;
  extra: { cooking_style?: string };
};

/** Turns the on-device draft into the request body. Cycle answers are only sent when tracking it. */
export function buildOnboardingPayload(draft: OnboardingDraft): OnboardingPayload {
  const cycle = tracksCycle(draft);
  const payload: OnboardingPayload = {
    heard_from: draft.heardFrom ?? undefined,
    goal: draft.goal,
    oil_percent: draft.oil,
    sample_meals: draft.sampleMealIds.map((recipe_id) => ({ recipe_id })),
    modules: effectiveModules(draft),
    last_period_start: cycle && !draft.lastPeriodUnknown ? draft.lastPeriodStart : undefined,
    last_period_unknown: cycle && draft.lastPeriodUnknown,
    cycle_length_days: cycle ? draft.cycleLengthDays : undefined,
    discreet_mode: cycle && draft.discreetMode,
    sex: draft.sex,
    body_type: draft.bodyType,
    height_cm: draft.heightCm,
    weight_kg: draft.weightKg,
    activity_level: draft.activityLevel,
    blood_pressure: draft.bloodPressure,
    has_diabetes: draft.hasDiabetes,
    notifications_enabled: draft.notificationsEnabled,
    widget_enabled: draft.widgetEnabled,
    extra: draft.cookingStyle ? { cooking_style: draft.cookingStyle } : {},
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
  default_portion_g: z.number().nullish(),
  image_url: z.string().nullish(),
});

export type SampleRecipe = z.infer<typeof sampleRecipeSchema>;

/** The preloaded meals for the onboarding sandbox carousel (`GET /api/v1/food/recipes`). */
export async function fetchSampleRecipes(): Promise<SampleRecipe[]> {
  const json = await apiFetch('/food/recipes');
  return z.object({ recipes: z.array(sampleRecipeSchema) }).parse(json).recipes;
}
