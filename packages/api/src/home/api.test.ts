import { ApiError, apiFetch } from '../backend';
import {
  fetchDailySummary,
  fetchMealSuggestions,
  regenerateMealSuggestions,
  suggestionsNotReady,
} from './api';

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('fetchDailySummary', () => {
  it('sends the local day and timezone and keeps the figures as returned', async () => {
    mockFetch.mockResolvedValueOnce({
      date: '2026-10-24',
      timezone: 'Asia/Dhaka',
      target_kcal: 1763,
      consumed_kcal: 980.4,
      meals: { breakfast: true, lunch: false, snacks: true, dinner: false },
    });

    const summary = await fetchDailySummary({ date: '2026-10-24', tz: 'Asia/Dhaka' });

    expect(mockFetch).toHaveBeenCalledWith('/dashboard?date=2026-10-24&tz=Asia%2FDhaka');
    expect(summary).toEqual({
      date: '2026-10-24',
      timezone: 'Asia/Dhaka',
      target_kcal: 1763,
      consumed_kcal: 980.4,
      meals: [
        { slot: 'breakfast', logged: true },
        { slot: 'lunch', logged: false },
        { slot: 'snack', logged: true },
        { slot: 'dinner', logged: false },
      ],
    });
  });

  it('allows a missing target', async () => {
    mockFetch.mockResolvedValueOnce({
      date: '2026-10-24',
      timezone: 'Asia/Dhaka',
      target_kcal: null,
      consumed_kcal: 0,
      meals: { breakfast: false, lunch: false, snacks: false, dinner: false },
    });
    const summary = await fetchDailySummary({ date: '2026-10-24', tz: 'Asia/Dhaka' });
    expect(summary?.target_kcal).toBeNull();
  });

  it('returns null when there is no profile yet', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError(404, 'Profile not found.'));
    await expect(fetchDailySummary({ date: '2026-10-24', tz: 'Asia/Dhaka' })).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await expect(fetchDailySummary({ date: '2026-10-24', tz: 'Asia/Dhaka' })).rejects.toThrow(
      'boom',
    );
  });
});

const row = (meal_slot: string, extra: Record<string, unknown> = {}) => ({
  id: `s-${meal_slot}`,
  user_id: 'u1',
  suggestion_date: '2026-11-17',
  meal_slot,
  recipe_id: `r-${meal_slot}`,
  grams: '320.5',
  kcal: 540,
  target_kcal: 600,
  reason: 'Designed around your remaining 1600 kcal today.',
  created_at: '2026-11-17T03:00:00Z',
  recipes: {
    id: `r-${meal_slot}`,
    name: 'Khichuri',
    name_bn: '',
    cooking_method: 'bhuna',
    thumbnail_url: 'https://placehold.co/600x400',
    servings: 4,
    weight_g: 1200,
  },
  ...extra,
});

describe('fetchMealSuggestions', () => {
  it('orders meals through the day and keeps figures and reasons as returned', async () => {
    mockFetch.mockResolvedValueOnce({
      date: '2026-11-17',
      target_kcal: 1800,
      consumed_kcal: 200,
      remaining_kcal: 1600,
      suggestions: [row('breakfast'), row('dinner'), row('lunch')],
      cached: false,
    });

    const result = await fetchMealSuggestions('u1');

    expect(mockFetch).toHaveBeenCalledWith('/food/suggestions/u1');
    expect(result.suggestions.map((s) => s.meal_slot)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(result.suggestions[0]).toMatchObject({
      grams: 320.5,
      kcal: 540,
      reason: 'Designed around your remaining 1600 kcal today.',
      tried: false,
      note: null,
      // Placeholder photo and empty Bengali name are treated as missing.
      recipes: { id: 'r-breakfast', name_bn: null, cooking_method: 'bhuna', image_url: null },
    });
  });

  it('accepts the cached shape without kcal figures, and the proposed tried/note fields', async () => {
    mockFetch.mockResolvedValueOnce({
      date: '2026-11-17',
      cached: true,
      suggestions: [row('lunch', { tried: true, note: 'Describes the food, not you.' })],
    });
    const result = await fetchMealSuggestions('u1');
    expect(result.target_kcal).toBeUndefined();
    expect(result.suggestions[0]?.tried).toBe(true);
    expect(result.suggestions[0]?.note).toBe('Describes the food, not you.');
  });

  it('asks for a fresh set with POST …/new', async () => {
    mockFetch.mockResolvedValueOnce({ date: '2026-11-17', suggestions: [] });
    await regenerateMealSuggestions('u 1');
    expect(mockFetch).toHaveBeenCalledWith('/food/suggestions/u%201/new', { method: 'POST' });
  });

  it('treats 422 as "not ready yet", other errors as errors', () => {
    expect(suggestionsNotReady(new ApiError(422, 'not enough suitable recipes'))).toBe(true);
    expect(suggestionsNotReady(new ApiError(500, 'boom'))).toBe(false);
    expect(suggestionsNotReady(new Error('x'))).toBe(false);
  });
});
