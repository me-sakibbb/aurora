import { ApiError, apiFetch } from '../backend';
import { fetchDailySummary } from './api';

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
