import { buildOnboardingPayload, servingGrams } from './api';
import {
  ageFromBirthYear,
  birthYearRange,
  emptyDraft,
  type OnboardingDraft,
  restoreDraft,
  toggleGoal,
} from './draft';

const answered: OnboardingDraft = {
  ...emptyDraft(),
  heardFrom: 'instagram',
  goals: ['hormonal', 'energy'],
  dietaryPattern: 'no_beef',
  cookingStyle: 'meal_prep',
  oil: 'typical',
  sampleMeals: [
    { recipeId: 'r1', grams: 250 },
    { recipeId: 'r2', grams: 180 },
  ],
  sex: 'female',
  bodyType: 'average',
  birthYear: new Date().getFullYear() - 29,
  heightCm: 158,
  weightKg: 55.5,
  activityLevel: 'lightly_active',
  bloodPressure: 'normal',
  hasDiabetes: false,
  notificationsEnabled: true,
  widgetEnabled: false,
};

describe('buildOnboardingPayload', () => {
  it('maps every answer to the backend field names', () => {
    expect(buildOnboardingPayload(answered)).toEqual({
      heard_from: 'instagram',
      goals: ['hormonal', 'energy'],
      dietary_pattern: 'no_beef',
      cooking_style: 'meal_prep',
      oil_percent: 'typical',
      sample_meals: [
        { recipe_id: 'r1', grams: 250 },
        { recipe_id: 'r2', grams: 180 },
      ],
      sex: 'female',
      body_type: 'average',
      age_years: 29,
      height_cm: 158,
      weight_kg: 55.5,
      activity_level: 'lightly_active',
      blood_pressure: 'normal',
      has_diabetes: false,
      notifications_enabled: true,
      widget_enabled: false,
    });
  });

  it('omits skipped questions and sends height as whole centimetres', () => {
    const payload = buildOnboardingPayload({ ...answered, heardFrom: null, heightCm: 157.5 });
    expect('heard_from' in payload).toBe(false);
    expect(payload.height_cm).toBe(158);
  });
});

describe('toggleGoal', () => {
  it('adds and removes goals, keeping weight loss and gain apart', () => {
    expect(toggleGoal(['hormonal'], 'energy')).toEqual(['hormonal', 'energy']);
    expect(toggleGoal(['hormonal', 'energy'], 'hormonal')).toEqual(['energy']);
    expect(toggleGoal(['weight_loss', 'mindful'], 'weight_gain')).toEqual([
      'mindful',
      'weight_gain',
    ]);
  });
});

describe('restoreDraft', () => {
  it('drops answers saved with options that no longer exist', () => {
    const draft = restoreDraft({
      goal: 'weight',
      activityLevel: 'light',
      bodyType: 'full',
      sampleMealIds: ['r1'],
      modules: ['food', 'cycle'],
      sex: 'female',
    });
    expect(draft).toEqual({ ...emptyDraft(), sex: 'female' });
  });

  it('carries a single saved goal over to the list', () => {
    expect(restoreDraft({ goal: 'energy' }).goals).toEqual(['energy']);
  });

  it('turns a saved age into a birth year', () => {
    expect(restoreDraft({ ageYears: 30 }).birthYear).toBe(new Date().getFullYear() - 30);
  });
});

describe('birth year', () => {
  const now = new Date(2026, 9, 12);

  it('offers the years for ages the backend accepts', () => {
    expect(birthYearRange(now)).toEqual({ min: 1946, max: 2013, default: 2001 });
  });

  it('sends the age reached this year, within range', () => {
    expect(ageFromBirthYear(1997, now)).toBe(29);
    expect(ageFromBirthYear(2020, now)).toBe(13);
    expect(ageFromBirthYear(1900, now)).toBe(80);
  });
});

describe('servingGrams', () => {
  it("splits the recipe's weight over its servings", () => {
    expect(servingGrams({ weight_g: 1000, servings: 4 })).toBe(250);
    expect(servingGrams({ weight_g: null, servings: 4 })).toBe(100);
  });
});
