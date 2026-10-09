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
import {
  ACTIVITY_LEVELS,
  BLOOD_PRESSURES,
  BODY_TYPES,
  COOKING_STYLES,
  DIETARY_PATTERNS,
  EXCLUSIVE_GOALS,
  GOALS,
  HEARD_FROM,
  OIL_LEVELS,
  SEXES,
} from './options';

export type HeightUnit = 'cm' | 'ftin';
export type WeightUnit = 'kg' | 'lb';

/** A meal tried in the sandbox: the recipe and the portion it was shown with. */
export type SampleMeal = { recipeId: string; grams: number };

/**
 * Everything answered so far. Kept on the device (answers before sign-up have no account to go
 * to yet) and sent to the backend in one request at the end. `undefined` = not answered yet.
 */
export type OnboardingDraft = {
  /** `null` = skipped. */
  heardFrom?: HeardFrom | null;
  /** In the order picked. */
  goals: Goal[];
  dietaryPattern?: DietaryPattern;
  cookingStyle?: CookingStyle;
  oil?: OilLevel;
  sampleMeals: SampleMeal[];
  sex?: Sex;
  bodyType?: BodyType;
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  activityLevel?: ActivityLevel;
  bloodPressure?: BloodPressure;
  hasDiabetes?: boolean;
  notificationsEnabled?: boolean;
  widgetEnabled?: boolean;
};

export const emptyDraft = (): OnboardingDraft => ({
  goals: [],
  sampleMeals: [],
  heightUnit: 'cm',
  weightUnit: 'kg',
});

/** Adds or removes a goal. Picking one of an exclusive pair drops the other. */
export function toggleGoal(goals: readonly Goal[], goal: Goal): Goal[] {
  if (goals.includes(goal)) return goals.filter((g) => g !== goal);
  const excluded = EXCLUSIVE_GOALS.filter((set) => set.includes(goal)).flat();
  return [...goals.filter((g) => !excluded.includes(g)), goal];
}

const oneOf = <T extends string>(options: readonly T[], value: unknown): T | undefined =>
  options.includes(value as T) ? (value as T) : undefined;

/**
 * Rebuilds a draft saved by an older app version: answers whose options have since changed (or
 * questions that were removed) are dropped so they get asked again instead of failing the submit.
 */
export function restoreDraft(saved: unknown): OnboardingDraft {
  const raw = (saved && typeof saved === 'object' ? saved : {}) as Record<string, unknown>;
  const draft = emptyDraft();
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined);
  const bool = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

  draft.heardFrom = raw.heardFrom === null ? null : oneOf(HEARD_FROM, raw.heardFrom);
  // Before multi-select this was a single `goal`.
  const goals = Array.isArray(raw.goals) ? raw.goals : raw.goal ? [raw.goal] : [];
  draft.goals = goals.reduce<Goal[]>((acc, g) => {
    const goal = oneOf(GOALS, g);
    return goal ? toggleGoal(acc, goal) : acc;
  }, []);
  draft.dietaryPattern = oneOf(DIETARY_PATTERNS, raw.dietaryPattern);
  draft.cookingStyle = oneOf(COOKING_STYLES, raw.cookingStyle);
  draft.oil = oneOf(OIL_LEVELS, raw.oil);
  // Older drafts stored recipe ids without a portion; those are picked again in the sandbox.
  draft.sampleMeals = Array.isArray(raw.sampleMeals)
    ? raw.sampleMeals.filter(
        (m): m is SampleMeal =>
          typeof m?.recipeId === 'string' && typeof m?.grams === 'number' && m.grams > 0,
      )
    : [];
  draft.sex = oneOf(SEXES, raw.sex);
  draft.bodyType = oneOf(BODY_TYPES, raw.bodyType);
  draft.ageYears = num(raw.ageYears);
  draft.heightCm = num(raw.heightCm);
  draft.weightKg = num(raw.weightKg);
  draft.heightUnit = raw.heightUnit === 'ftin' ? 'ftin' : 'cm';
  draft.weightUnit = raw.weightUnit === 'lb' ? 'lb' : 'kg';
  draft.activityLevel = oneOf(ACTIVITY_LEVELS, raw.activityLevel);
  draft.bloodPressure = oneOf(BLOOD_PRESSURES, raw.bloodPressure);
  draft.hasDiabetes = bool(raw.hasDiabetes);
  draft.notificationsEnabled = bool(raw.notificationsEnabled);
  draft.widgetEnabled = bool(raw.widgetEnabled);
  // Drop the keys left undefined, matching a freshly answered draft.
  return JSON.parse(JSON.stringify(draft)) as OnboardingDraft;
}
