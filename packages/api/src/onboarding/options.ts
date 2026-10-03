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
export const GOALS = ['weight', 'hormonal', 'mindful', 'energy'] as const;
/** Not a backend field yet: sent as `extra.cooking_style`. */
export const COOKING_STYLES = ['quick', 'traditional', 'meal_prep', 'budget'] as const;
export const OIL_LEVELS = ['low', 'typical', 'high'] as const;
export const SEXES = ['female', 'male', 'other'] as const;
export const MODULES = ['food', 'cycle'] as const;
// PLACEHOLDER: the backend accepts any string for these two. Replace once the options are final.
export const BODY_TYPES = ['slim', 'average', 'athletic', 'full'] as const;
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active'] as const;
export const BLOOD_PRESSURES = ['normal', 'high', 'low', 'unknown'] as const;

export type HeardFrom = (typeof HEARD_FROM)[number];
export type Goal = (typeof GOALS)[number];
export type CookingStyle = (typeof COOKING_STYLES)[number];
export type OilLevel = (typeof OIL_LEVELS)[number];
export type Sex = (typeof SEXES)[number];
export type AppModule = (typeof MODULES)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type BloodPressure = (typeof BLOOD_PRESSURES)[number];

/** Input ranges (UI limits, not health rules). Values are always stored in cm / kg. */
export const CYCLE_LENGTH = { min: 21, max: 45, default: 28 } as const;
export const HEIGHT_CM = { min: 120, max: 220, default: 160 } as const;
export const WEIGHT_KG = { min: 30, max: 200, default: 60 } as const;
/** The sandbox lets people try logging up to this many sample meals. */
export const MAX_SAMPLE_MEALS = 2;
