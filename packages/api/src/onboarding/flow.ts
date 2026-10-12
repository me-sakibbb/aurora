import type { OnboardingDraft } from './draft';

/**
 * Every onboarding step, in order. Steps up to `signUp` can be answered signed out; the rest need
 * an account. Which steps show depends on auth state and platform (`isStepVisible`).
 */
export const ONBOARDING_STEPS = [
  'welcome',
  'heardFrom',
  'goal',
  'diet',
  'kitchen',
  'sandbox',
  'signUp',
  'sex',
  'bodyType',
  'birthYear',
  'measurements',
  'activity',
  'health',
  'calibration',
  'notifications',
  'widget',
] as const;

export type StepId = (typeof ONBOARDING_STEPS)[number];

const order = (step: StepId) => ONBOARDING_STEPS.indexOf(step);
const SIGN_UP_INDEX = order('signUp');

/** Steps from older app versions, mapped to where a saved draft should pick up again. */
const RETIRED_STEPS: Record<string, StepId> = {
  cookingStyle: 'kitchen',
  oil: 'kitchen',
  age: 'birthYear',
  height: 'measurements',
  weight: 'measurements',
  // The cycle questions were removed (2026-10-09); they came right after `sex`.
  features: 'sex',
  lastPeriod: 'sex',
  cycleLength: 'sex',
  discreetMode: 'sex',
};

/** The saved step as a current step id (`undefined` if it can't be placed). */
export function restoreStep(saved: unknown): StepId | undefined {
  if (typeof saved !== 'string') return undefined;
  if ((ONBOARDING_STEPS as readonly string[]).includes(saved)) return saved as StepId;
  return RETIRED_STEPS[saved];
}

export type FlowContext = {
  signedIn: boolean;
  /** Home-screen widgets only exist on native. */
  platform: 'web' | 'native';
};

export function isStepVisible(step: StepId, { signedIn, platform }: FlowContext): boolean {
  const index = order(step);
  // Signed out: everything up to and including the sign-up gate. Signed in: everything but the
  // welcome and the gate (people who signed up directly still answer the pre-sign-up questions).
  if (!signedIn && index > SIGN_UP_INDEX) return false;
  if (signedIn && (step === 'welcome' || step === 'signUp')) return false;

  return step !== 'widget' || platform === 'native';
}

export const visibleSteps = (ctx: FlowContext): StepId[] =>
  ONBOARDING_STEPS.filter((step) => isStepVisible(step, ctx));

/**
 * The step to show. The saved step can stop being visible (e.g. the sign-up gate once the person
 * has an account); then continue from the next visible step after it.
 */
export function resolveCurrentStep(saved: StepId | undefined, ctx: FlowContext): StepId {
  const steps = visibleSteps(ctx);
  const first = steps[0] as StepId;
  if (!saved) return first;
  if (steps.includes(saved)) return saved;
  return steps.find((step) => order(step) > order(saved)) ?? (steps[steps.length - 1] as StepId);
}

export function nextStep(current: StepId, ctx: FlowContext): StepId | null {
  const steps = visibleSteps(ctx);
  return steps[steps.indexOf(current) + 1] ?? null;
}

export function previousStep(current: StepId, ctx: FlowContext): StepId | null {
  const steps = visibleSteps(ctx);
  const index = steps.indexOf(current);
  return index > 0 ? (steps[index - 1] as StepId) : null;
}

/** Whether a question step has a valid answer (so "Continue" can be enabled). */
export function isStepAnswered(step: StepId, draft: OnboardingDraft): boolean {
  switch (step) {
    case 'goal':
      return draft.goals.length > 0;
    case 'diet':
      return draft.dietaryPattern !== undefined;
    case 'kitchen':
      return draft.cookingStyle !== undefined && draft.oil !== undefined;
    case 'sandbox':
      return draft.sampleMeals.length > 0;
    case 'sex':
      return draft.sex !== undefined;
    case 'bodyType':
      return draft.bodyType !== undefined;
    case 'birthYear':
      return draft.birthYear !== undefined;
    case 'measurements':
      return draft.heightCm !== undefined && draft.weightKg !== undefined;
    case 'activity':
      return draft.activityLevel !== undefined;
    case 'health':
      return draft.bloodPressure !== undefined && draft.hasDiabetes !== undefined;
    default:
      // Welcome, skippable/defaulted questions, and action steps (gate, review, permissions).
      return true;
  }
}
