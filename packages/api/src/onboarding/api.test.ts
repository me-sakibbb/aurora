import { buildOnboardingPayload } from './api';
import { emptyDraft, type OnboardingDraft } from './draft';

const answered: OnboardingDraft = {
  ...emptyDraft(),
  heardFrom: 'instagram',
  goal: 'hormonal',
  cookingStyle: 'meal_prep',
  oil: 'typical',
  sampleMealIds: ['r1', 'r2'],
  sex: 'female',
  modules: ['food', 'cycle'],
  lastPeriodStart: '2026-09-20',
  cycleLengthDays: 30,
  discreetMode: true,
  bodyType: 'average',
  heightCm: 158,
  weightKg: 55.5,
  activityLevel: 'light',
  bloodPressure: 'normal',
  hasDiabetes: false,
  notificationsEnabled: true,
  widgetEnabled: false,
};

describe('buildOnboardingPayload', () => {
  it('maps every answer to the backend field names', () => {
    expect(buildOnboardingPayload(answered)).toEqual({
      heard_from: 'instagram',
      goal: 'hormonal',
      oil_percent: 'typical',
      sample_meals: [{ recipe_id: 'r1' }, { recipe_id: 'r2' }],
      modules: ['food', 'cycle'],
      last_period_start: '2026-09-20',
      last_period_unknown: false,
      cycle_length_days: 30,
      discreet_mode: true,
      sex: 'female',
      body_type: 'average',
      height_cm: 158,
      weight_kg: 55.5,
      activity_level: 'light',
      blood_pressure: 'normal',
      has_diabetes: false,
      notifications_enabled: true,
      widget_enabled: false,
      extra: { cooking_style: 'meal_prep' },
    });
  });

  it('leaves out cycle answers when not tracking the cycle', () => {
    const payload = buildOnboardingPayload({ ...answered, sex: 'male' });
    expect(payload.modules).toEqual(['food']);
    expect(payload.last_period_start).toBeUndefined();
    expect(payload.cycle_length_days).toBeUndefined();
    expect(payload.discreet_mode).toBe(false);
  });

  it('sends "don\'t recall" without a date, and omits skipped questions', () => {
    const payload = buildOnboardingPayload({
      ...answered,
      heardFrom: null,
      lastPeriodUnknown: true,
    });
    expect(payload.last_period_unknown).toBe(true);
    expect(payload.last_period_start).toBeUndefined();
    expect('heard_from' in payload).toBe(false);
  });
});
