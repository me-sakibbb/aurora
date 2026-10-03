import { emptyDraft } from './draft';
import {
  type FlowContext,
  isStepAnswered,
  nextStep,
  previousStep,
  resolveCurrentStep,
  visibleSteps,
} from './flow';

const ctx = (overrides: Partial<FlowContext> = {}): FlowContext => ({
  signedIn: false,
  platform: 'native',
  draft: { sex: 'female', modules: ['food', 'cycle'] },
  ...overrides,
});

describe('visibleSteps', () => {
  it('stops at the sign-up gate while signed out', () => {
    const steps = visibleSteps(ctx());
    expect(steps[0]).toBe('welcome');
    expect(steps[steps.length - 1]).toBe('signUp');
    expect(steps).toContain('lastPeriod');
  });

  it('skips welcome and the gate once signed in, but keeps the pre-sign-up questions', () => {
    const steps = visibleSteps(ctx({ signedIn: true }));
    expect(steps[0]).toBe('heardFrom');
    expect(steps).not.toContain('signUp');
    expect(steps).toContain('goal');
    expect(steps[steps.length - 1]).toBe('widget');
  });

  it('hides feature selection and the cycle steps for male users', () => {
    const steps = visibleSteps(ctx({ draft: { sex: 'male', modules: ['food', 'cycle'] } }));
    expect(steps).not.toContain('features');
    expect(steps).not.toContain('lastPeriod');
    expect(steps).not.toContain('discreetMode');
  });

  it('hides the cycle steps when only food tracking is chosen', () => {
    expect(visibleSteps(ctx({ draft: { sex: 'female', modules: ['food'] } }))).not.toContain(
      'cycleLength',
    );
  });

  it('ends with notifications on web (no widgets)', () => {
    const steps = visibleSteps(ctx({ signedIn: true, platform: 'web' }));
    expect(steps[steps.length - 1]).toBe('notifications');
  });
});

describe('resolveCurrentStep', () => {
  it('starts at the first visible step', () => {
    expect(resolveCurrentStep(undefined, ctx())).toBe('welcome');
    expect(resolveCurrentStep(undefined, ctx({ signedIn: true }))).toBe('heardFrom');
  });

  it('continues after the sign-up gate once the account exists', () => {
    expect(resolveCurrentStep('signUp', ctx({ signedIn: true }))).toBe('bodyType');
  });

  it('moves past steps that stopped applying', () => {
    expect(resolveCurrentStep('lastPeriod', ctx({ draft: { sex: 'male', modules: [] } }))).toBe(
      'signUp',
    );
  });
});

describe('nextStep / previousStep', () => {
  it('walks the visible steps', () => {
    expect(nextStep('features', ctx())).toBe('lastPeriod');
    expect(nextStep('features', ctx({ draft: { sex: 'female', modules: ['food'] } }))).toBe(
      'signUp',
    );
    expect(previousStep('bodyType', ctx({ signedIn: true }))).toBe('discreetMode');
    expect(previousStep('welcome', ctx())).toBeNull();
    expect(nextStep('widget', ctx({ signedIn: true }))).toBeNull();
  });
});

describe('isStepAnswered', () => {
  it('requires an answer for questions and allows skippable ones', () => {
    const draft = emptyDraft();
    expect(isStepAnswered('goal', draft)).toBe(false);
    expect(isStepAnswered('heardFrom', draft)).toBe(true);
    expect(isStepAnswered('lastPeriod', draft)).toBe(false);
    expect(isStepAnswered('lastPeriod', { ...draft, lastPeriodUnknown: true })).toBe(true);
    expect(isStepAnswered('health', { ...draft, bloodPressure: 'normal' })).toBe(false);
    expect(
      isStepAnswered('health', { ...draft, bloodPressure: 'normal', hasDiabetes: false }),
    ).toBe(true);
  });
});
