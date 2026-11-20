import { ApiError } from '../backend';
import { classifyRecipeError, isAddedWater, needsAddedWater } from './recipe-rules';

describe('needsAddedWater', () => {
  it('asks for water only for methods cooked in water', () => {
    expect(needsAddedWater('torkari', [{ name_en: 'Potato' }])).toBe(true);
    expect(needsAddedWater('dal', [])).toBe(true);
    expect(needsAddedWater('bhaji', [{ name_en: 'Potato' }])).toBe(false);
    expect(needsAddedWater(null, [])).toBe(false);
  });

  it('accepts the names the backend accepts, in any case', () => {
    expect(needsAddedWater('curry', [{ name_en: 'Water (Added)' }])).toBe(false);
    expect(needsAddedWater('jhol', [{ name_en: ' water ' }])).toBe(false);
    expect(isAddedWater('Water, drinking')).toBe(false);
    expect(isAddedWater('Coconut Water')).toBe(false);
  });
});

describe('classifyRecipeError', () => {
  const api = (status: number, detail: string) => new ApiError(status, detail);

  it('routes known validation messages to the step that fixes them', () => {
    expect(
      classifyRecipeError(api(422, 'torkari recipes require a water-added ingredient')),
    ).toEqual({ kind: 'water', step: 'ingredients' });
    expect(classifyRecipeError(api(422, 'ingredient 123 not found in bfct_foods'))).toMatchObject({
      kind: 'missingIngredient',
    });
    expect(classifyRecipeError(api(422, 'ingredient food_ids must be unique'))).toMatchObject({
      kind: 'duplicateIngredient',
    });
    expect(classifyRecipeError(api(422, 'weight_g must be greater than 0'))).toMatchObject({
      kind: 'weight',
      step: 'weight',
    });
  });

  it('keeps an unknown 4xx message as returned', () => {
    expect(classifyRecipeError(api(422, 'something new'))).toEqual({
      kind: 'invalid',
      step: null,
      detail: 'something new',
    });
  });

  it('sorts transport and auth failures', () => {
    expect(classifyRecipeError(api(401, 'unauthorized')).kind).toBe('signedOut');
    expect(classifyRecipeError(api(404, 'recipe not found')).kind).toBe('notFound');
    expect(classifyRecipeError(api(502, 'bad gateway')).kind).toBe('server');
    expect(classifyRecipeError(new TypeError('Failed to fetch')).kind).toBe('offline');
    expect(classifyRecipeError(new Error('?')).kind).toBe('unknown');
  });
});
