import { emptyDraft } from './draft';
import {
  type FlowContext,
  isStepAnswered,
  nextStep,
  previousStep,
  resolveCurrentStep,
  restoreStep,
  visibleSteps,
} from './flow';

const ctx = (overrides: Partial<FlowContext> = {}): FlowContext => ({
  signedIn: false,
  platform: 'native',
  ...overrides,
});

describe('visibleSteps', () => {
  it('stops at the sign-up gate while signed out', () => {
    const steps = visibleSteps(ctx());
    expect(steps[0]).toBe('welcome');
    expect(steps[steps.length - 1]).toBe('signUp');
    expect(steps).toContain('kitchen');
  });

  it('skips welcome and the gate once signed in, but keeps the pre-sign-up questions', () => {
    const steps = visibleSteps(ctx({ signedIn: true }));
    expect(steps[0]).toBe('heardFrom');
    expect(steps).not.toContain('signUp');
    expect(steps).toContain('goal');
    expect(steps[steps.length - 1]).toBe('widget');
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
    expect(resolveCurrentStep('signUp', ctx({ signedIn: true }))).toBe('sex');
  });
});

describe('restoreStep', () => {
  it('maps steps from older versions onto the current flow', () => {
    expect(restoreStep('sandbox')).toBe('sandbox');
    expect(restoreStep('oil')).toBe('kitchen');
    expect(restoreStep('lastPeriod')).toBe('sex');
    expect(restoreStep('age')).toBe('birthYear');
    expect(restoreStep('height')).toBe('measurements');
    expect(restoreStep('nonsense')).toBeUndefined();
  });
});

describe('nextStep / previousStep', () => {
  it('walks the visible steps', () => {
    expect(nextStep('goal', ctx())).toBe('diet');
    expect(nextStep('sandbox', ctx())).toBe('signUp');
    expect(nextStep('sex', ctx({ signedIn: true }))).toBe('bodyType');
    expect(nextStep('bodyType', ctx({ signedIn: true }))).toBe('birthYear');
    expect(nextStep('birthYear', ctx({ signedIn: true }))).toBe('measurements');
    expect(previousStep('activity', ctx({ signedIn: true }))).toBe('measurements');
    expect(previousStep('welcome', ctx())).toBeNull();
    expect(nextStep('widget', ctx({ signedIn: true }))).toBeNull();
  });
});

describe('isStepAnswered', () => {
  it('requires an answer for questions and allows skippable ones', () => {
    const draft = emptyDraft();
    expect(isStepAnswered('goal', draft)).toBe(false);
    expect(isStepAnswered('goal', { ...draft, goals: ['energy'] })).toBe(true);
    expect(isStepAnswered('heardFrom', draft)).toBe(true);
    expect(isStepAnswered('kitchen', { ...draft, cookingStyle: 'quick' })).toBe(false);
    expect(isStepAnswered('kitchen', { ...draft, cookingStyle: 'quick', oil: 'low' })).toBe(true);
    expect(isStepAnswered('birthYear', draft)).toBe(false);
    expect(isStepAnswered('measurements', { ...draft, heightCm: 160 })).toBe(false);
    expect(isStepAnswered('measurements', { ...draft, heightCm: 160, weightKg: 60 })).toBe(true);
    expect(isStepAnswered('health', { ...draft, bloodPressure: 'normal' })).toBe(false);
    expect(
      isStepAnswered('health', { ...draft, bloodPressure: 'normal', hasDiabetes: false }),
    ).toBe(true);
  });
});
