// Answer values for F2 onboarding. Where the backend defines a field (aurora-backend
// `app/api/v1/endpoints/onboarding.py`), these must match its Literal values exactly.

export const HEARD_FROM = [
  'app_store',
  'instagram',
  'tiktok',
  'friend',
  'facebook',
  'other',
] as const;
export const GOALS = ['weight_loss', 'weight_gain', 'hormonal', 'mindful', 'energy'] as const;
/** Goals that can't be picked together (the later pick replaces the earlier one). */
export const EXCLUSIVE_GOALS: readonly (readonly Goal[])[] = [['weight_loss', 'weight_gain']];
export const DIETARY_PATTERNS = ['omnivore', 'vegetarian', 'no_beef'] as const;
export const COOKING_STYLES = ['quick', 'traditional', 'meal_prep', 'budget'] as const;
export const OIL_LEVELS = ['low', 'typical', 'high'] as const;
export const SEXES = ['female', 'male', 'other'] as const;
export const BODY_TYPES = ['slim', 'average', 'athletic', 'fuller'] as const;
export const ACTIVITY_LEVELS = [
  'mostly_sitting',
  'lightly_active',
  'moderately_active',
  'very_active',
] as const;
export const BLOOD_PRESSURES = ['normal', 'high', 'low', 'unknown'] as const;

export type HeardFrom = (typeof HEARD_FROM)[number];
export type Goal = (typeof GOALS)[number];
export type DietaryPattern = (typeof DIETARY_PATTERNS)[number];
export type CookingStyle = (typeof COOKING_STYLES)[number];
export type OilLevel = (typeof OIL_LEVELS)[number];
export type Sex = (typeof SEXES)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type BloodPressure = (typeof BLOOD_PRESSURES)[number];

/** Input ranges (UI limits, not health rules). Values are always stored in cm / kg. */
/** Ages the backend accepts. Asked as a birth year (see `birthYearRange`). */
export const AGE_YEARS = { min: 13, max: 80, default: 25 } as const;
export const HEIGHT_CM = { min: 120, max: 220, default: 160 } as const;
export const WEIGHT_KG = { min: 30, max: 200, default: 60 } as const;
/** The sandbox lets people try logging up to this many sample meals. */
export const MAX_SAMPLE_MEALS = 2;
