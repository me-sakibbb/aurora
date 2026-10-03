import type {
  ActivityLevel,
  AppModule,
  BloodPressure,
  BodyType,
  CookingStyle,
  Goal,
  HeardFrom,
  OilLevel,
  Sex,
} from './options';
import { CYCLE_LENGTH } from './options';

export type HeightUnit = 'cm' | 'ftin';
export type WeightUnit = 'kg' | 'lb';

/**
 * Everything answered so far. Kept on the device (answers before sign-up have no account to go
 * to yet) and sent to the backend in one request at the end. `undefined` = not answered yet.
 */
export type OnboardingDraft = {
  /** `null` = skipped. */
  heardFrom?: HeardFrom | null;
  goal?: Goal;
  cookingStyle?: CookingStyle;
  oil?: OilLevel;
  sampleMealIds: string[];
  sex?: Sex;
  modules: AppModule[];
  /** `YYYY-MM-DD`. */
  lastPeriodStart?: string;
  lastPeriodUnknown: boolean;
  cycleLengthDays: number;
  discreetMode: boolean;
  bodyType?: BodyType;
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
  sampleMealIds: [],
  modules: [],
  lastPeriodUnknown: false,
  cycleLengthDays: CYCLE_LENGTH.default,
  discreetMode: false,
  heightUnit: 'cm',
  weightUnit: 'kg',
});

/** Male users don't get the cycle module (decided 2026-10-03), whatever was picked before. */
export function effectiveModules(draft: Pick<OnboardingDraft, 'sex' | 'modules'>): AppModule[] {
  if (draft.sex === 'male') return ['food'];
  return draft.modules.length > 0 ? draft.modules : ['food'];
}

export const tracksCycle = (draft: Pick<OnboardingDraft, 'sex' | 'modules'>) =>
  effectiveModules(draft).includes('cycle');
