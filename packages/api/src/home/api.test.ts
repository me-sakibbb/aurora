import { ApiError, apiFetch } from '../backend';
import { getSupabase } from '../supabase';
import {
  dayHasLogs,
  fetchCalorieInsights,
  fetchDailySummary,
  fetchLogsBetween,
  fetchMealSuggestions,
  regenerateMealSuggestions,
  suggestionsNotReady,
} from './api';

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));

jest.mock('../supabase', () => ({ getSupabase: jest.fn() }));

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

describe('fetchLogsBetween', () => {
  it("reads the day's own logs newest first, with names, photo and stored kcal as is", async () => {
    const calls: [string, ...unknown[]][] = [];
    const builder: Record<string, unknown> = {};
    for (const method of ['from', 'select', 'eq', 'gte', 'lt', 'order']) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.limit = async () => ({
      error: null,
      data: [
        {
          id: 'l1',
          logged_at: '2026-11-20T11:00:00+00:00',
          grams: '125.0',
          kcal: 64.5,
          recipes: { name: 'Milk tea', name_bn: '', thumbnail_url: 'https://placehold.co/1' },
          bfct_foods: null,
        },
        {
          id: 'l2',
          logged_at: '2026-11-20T08:00:00+00:00',
          grams: null,
          kcal: null,
          recipes: null,
          bfct_foods: { name_en: 'Banana', name_bn: 'কলা' },
        },
      ],
    });
    (getSupabase as jest.Mock).mockReturnValue(builder);

    const logs = await fetchLogsBetween({ userId: 'u1', from: 'A', to: 'B' });

    expect(calls).toEqual(
      expect.arrayContaining([
        ['from', 'food_logs'],
        ['eq', 'user_id', 'u1'],
        ['gte', 'logged_at', 'A'],
        ['lt', 'logged_at', 'B'],
        ['order', 'logged_at', { ascending: false }],
      ]),
    );
    expect(logs).toEqual([
      {
        id: 'l1',
        logged_at: '2026-11-20T11:00:00+00:00',
        grams: 125,
        kcal: 64.5,
        name: 'Milk tea',
        name_bn: null,
        image_url: null,
      },
      {
        id: 'l2',
        logged_at: '2026-11-20T08:00:00+00:00',
        grams: null,
        kcal: null,
        name: 'Banana',
        name_bn: 'কলা',
        image_url: null,
      },
    ]);
  });
});

describe('fetchCalorieInsights', () => {
  const day = (date: string, consumed: number, unquantified = 0) => ({
    date,
    consumed_kcal: consumed,
    target_kcal: 1800,
    target_gap_kcal: 1800 - consumed,
    unquantified_entries: unquantified,
  });

  it('asks for the local range and keeps the figures as returned', async () => {
    mockFetch.mockResolvedValueOnce({
      timezone: 'Asia/Dhaka',
      start_date: '2026-11-14',
      end_date: '2026-11-20',
      target_kcal: 1800,
      summary: {
        total_consumed_kcal: 3600.4,
        average_consumed_kcal: 514.3,
        average_logged_day_kcal: 1800.2,
        days_in_range: 7,
        days_with_logs: 2,
        days_without_logs: 5,
        days_at_or_below_target: 1,
        target_adherence_pct: 50,
        days_compared_to_target: 2,
      },
      daily: [day('2026-11-19', 0, 1), day('2026-11-20', 640.5)],
    });

    const result = await fetchCalorieInsights({
      startDate: '2026-11-14',
      endDate: '2026-11-20',
      tz: 'Asia/Dhaka',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/calories/insights?start_date=2026-11-14&end_date=2026-11-20&tz=Asia%2FDhaka',
    );
    expect(result?.summary.average_logged_day_kcal).toBe(1800.2);
    expect(result?.daily[1]?.consumed_kcal).toBe(640.5);
  });

  it('returns null when there is no profile yet', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError(404, 'Profile not found.'));
    await expect(
      fetchCalorieInsights({ startDate: 'a', endDate: 'b', tz: 'Asia/Dhaka' }),
    ).resolves.toBeNull();
  });

  it('counts a day with a log but no kcal figure as logged', () => {
    expect(dayHasLogs(day('d', 0, 1))).toBe(true);
    expect(dayHasLogs(day('d', 120))).toBe(true);
    expect(dayHasLogs(day('d', 0))).toBe(false);
  });
});
