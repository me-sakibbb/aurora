import { apiFetch } from '../backend';
import { fetchMoodBetween, fetchMoodInsight, fetchMoodPage, previousDay, saveMoodLog } from './api';

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const row = {
  id: 'a',
  user_id: 'u',
  day: '2026-11-15',
  mood: 4,
  energy: 3,
  sleep: null,
  stress: 2,
  tags: ['work', 'something-new'],
  note: null,
  created_at: '2026-11-15T08:00:00Z',
};

beforeEach(() => mockFetch.mockReset());

describe('saveMoodLog', () => {
  it('posts the day with a trimmed note and parses the saved row', async () => {
    mockFetch.mockResolvedValueOnce({ ...row, note: 'long day' });
    const saved = await saveMoodLog({
      day: '2026-11-15',
      mood: 4,
      energy: 3,
      sleep: null,
      stress: 2,
      tags: ['work'],
      note: '  long day  ',
    });
    expect(mockFetch).toHaveBeenCalledWith('/mood', {
      method: 'POST',
      body: {
        day: '2026-11-15',
        mood: 4,
        energy: 3,
        sleep: null,
        stress: 2,
        tags: ['work'],
        note: 'long day',
      },
    });
    expect(saved).toMatchObject({ day: '2026-11-15', mood: 4, note: 'long day', tags: ['work'] });
  });

  it('sends an empty note as null', async () => {
    mockFetch.mockResolvedValueOnce(row);
    await saveMoodLog({
      day: '2026-11-15',
      mood: 1,
      energy: null,
      sleep: null,
      stress: null,
      tags: [],
      note: '   ',
    });
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({ body: { note: null } });
  });
});

describe('reading entries', () => {
  it('asks for a date range and drops unknown tags', async () => {
    mockFetch.mockResolvedValueOnce({ logs: [row] });
    const logs = await fetchMoodBetween({ from: '2026-11-01', to: '2026-11-30' });
    expect(mockFetch).toHaveBeenCalledWith('/mood?from=2026-11-01&to=2026-11-30&limit=62', {
      signal: undefined,
    });
    expect(logs[0]).toEqual({
      day: '2026-11-15',
      mood: 4,
      energy: 3,
      sleep: null,
      stress: 2,
      tags: ['work'],
      note: null,
    });
  });

  it('pages history by asking for days before the oldest one shown', async () => {
    mockFetch.mockResolvedValue({ logs: [] });
    await fetchMoodPage({});
    expect(mockFetch).toHaveBeenLastCalledWith('/mood?limit=20', { signal: undefined });
    await fetchMoodPage({ before: '2026-03-01' });
    expect(mockFetch).toHaveBeenLastCalledWith('/mood?limit=20&to=2026-02-28', {
      signal: undefined,
    });
  });
});

describe('previousDay', () => {
  it('crosses month and year boundaries', () => {
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2024-03-01')).toBe('2024-02-29');
  });
});

describe('fetchMoodInsight', () => {
  const response = (days_logged: number, observation: string | null) => ({
    from: '2026-10-22',
    to: '2026-11-20',
    summary: { days_in_range: 30, days_logged, averages: {}, top_tags: [] },
    daily: [],
    observation,
  });

  it('asks for the range and keeps the sentence as written', async () => {
    mockFetch.mockResolvedValueOnce(response(6, 'Your average mood was positive at 4.1 out of 5.'));
    const insight = await fetchMoodInsight({ from: '2026-10-22', to: '2026-11-20' });
    expect(mockFetch).toHaveBeenCalledWith('/mood/insights?from=2026-10-22&to=2026-11-20', {
      signal: undefined,
    });
    expect(insight).toEqual({
      status: 'ready',
      text: 'Your average mood was positive at 4.1 out of 5.',
      days_logged: 6,
    });
  });

  it('marks a range with no check-ins as not enough data, still showing the wording', async () => {
    mockFetch.mockResolvedValueOnce(response(0, 'No mood entries were logged.'));
    const insight = await fetchMoodInsight({ from: 'a', to: 'b' });
    expect(insight?.status).toBe('not_enough_data');
    expect(insight?.text).toBe('No mood entries were logged.');
  });

  it('returns null when there is no sentence', async () => {
    mockFetch.mockResolvedValueOnce(response(3, '  '));
    await expect(fetchMoodInsight({ from: 'a', to: 'b' })).resolves.toBeNull();
  });
});
