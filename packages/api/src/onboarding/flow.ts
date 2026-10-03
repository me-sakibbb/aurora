import { type OnboardingDraft, tracksCycle } from './draft';

/**
 * Every onboarding step, in order. Steps up to `signUp` can be answered signed out; the rest need
 * an account. Which steps show depends on auth state, platform and earlier answers (`isStepVisible`).
 */
export const ONBOARDING_STEPS = [
  'welcome',
  'heardFrom',
  'goal',
  'cookingStyle',
  'oil',
  'sandbox',
  'sex',
  'features',
  'lastPeriod',
  'cycleLength',
  'discreetMode',
  'signUp',
  'bodyType',
  'height',
  'weight',
  'activity',
  'health',
  'calibration',
  'notifications',
  'widget',
] as const;

export type StepId = (typeof ONBOARDING_STEPS)[number];

const order = (step: StepId) => ONBOARDING_STEPS.indexOf(step);
const SIGN_UP_INDEX = order('signUp');

export type FlowContext = {
  signedIn: boolean;
  /** Home-screen widgets only exist on native. */
  platform: 'web' | 'native';
  draft: Pick<OnboardingDraft, 'sex' | 'modules'>;
};

export function isStepVisible(step: StepId, { signedIn, platform, draft }: FlowContext): boolean {
  const index = order(step);
  // Signed out: everything up to and including the sign-up gate. Signed in: everything but the
  // welcome and the gate (people who signed up directly still answer the pre-sign-up questions).
  if (!signedIn && index > SIGN_UP_INDEX) return false;
  if (signedIn && (step === 'welcome' || step === 'signUp')) return false;

  switch (step) {
    case 'features':
      return draft.sex !== 'male';
    case 'lastPeriod':
    case 'cycleLength':
    case 'discreetMode':
      return tracksCycle(draft);
    case 'widget':
      return platform === 'native';
    default:
      return true;
  }
}

export const visibleSteps = (ctx: FlowContext): StepId[] =>
  ONBOARDING_STEPS.filter((step) => isStepVisible(step, ctx));

/**
 * The step to show. The saved step can stop being visible (e.g. the sign-up gate once the person
 * has an account, or the cycle steps after switching sex to male); then continue from the next
 * visible step after it.
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
      return draft.goal !== undefined;
    case 'cookingStyle':
      return draft.cookingStyle !== undefined;
    case 'oil':
      return draft.oil !== undefined;
    case 'sandbox':
      return draft.sampleMealIds.length > 0;
    case 'sex':
      return draft.sex !== undefined;
    case 'features':
      return draft.modules.length > 0;
    case 'lastPeriod':
      return draft.lastPeriodUnknown || draft.lastPeriodStart !== undefined;
    case 'bodyType':
      return draft.bodyType !== undefined;
    case 'height':
      return draft.heightCm !== undefined;
    case 'weight':
      return draft.weightKg !== undefined;
    case 'activity':
      return draft.activityLevel !== undefined;
    case 'health':
      return draft.bloodPressure !== undefined && draft.hasDiabetes !== undefined;
    default:
      // Welcome, skippable/defaulted questions, and action steps (gate, review, permissions).
      return true;
  }
}
