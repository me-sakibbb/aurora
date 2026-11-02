import { apiFetch } from '../backend';
import {
  buildCycleSettingsBody,
  buildPhaseRequest,
  fetchCyclePhase,
  fetchCycleStatus,
  validatePeriodDates,
} from './api';
import { newId } from './ids';

jest.mock('../backend', () => ({
  ...jest.requireActual('../backend'),
  apiFetch: jest.fn(),
}));

const mockFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('fetchCycleStatus', () => {
  it('keeps only the fertile window range, never a single predicted day', async () => {
    mockFetch.mockResolvedValueOnce({
      enabled: true,
      ovulation: {
        user_id: 'u1',
        last_period_start: '2026-10-10',
        last_period_unknown: false,
        cycle_length_days: 28,
        discreet_mode: true,
      },
      fertility_window: {
        start: '2026-10-19',
        end: '2026-10-25',
        ovulation_start: '2026-10-22',
        ovulation_end: '2026-10-26',
        confidence: 'estimated',
      },
    });

    const status = await fetchCycleStatus();

    expect(mockFetch).toHaveBeenCalledWith('/ovulation');
    expect(status.fertility_window).toEqual({
      start: '2026-10-19',
      end: '2026-10-25',
      confidence: 'estimated',
    });
    expect(status.ovulation?.discreet_mode).toBe(true);
  });

  it('accepts a disabled account with nothing else', async () => {
    mockFetch.mockResolvedValueOnce({ enabled: false, ovulation: null, fertility_window: null });
    await expect(fetchCycleStatus()).resolves.toEqual({
      enabled: false,
      ovulation: null,
      fertility_window: null,
    });
  });
});

describe('buildCycleSettingsBody', () => {
  it('sends the stored discreet mode back and marks an unknown last period', () => {
    expect(
      buildCycleSettingsBody({
        userId: 'u1',
        lastPeriodStart: null,
        cycleLengthDays: null,
        discreetMode: true,
      }),
    ).toEqual({
      enabled: true,
      last_period_start: null,
      last_period_unknown: true,
      cycle_length_days: null,
      discreet_mode: true,
    });
  });

  it('passes the answers through as given', () => {
    expect(
      buildCycleSettingsBody({
        userId: 'u1',
        lastPeriodStart: '2026-10-10',
        cycleLengthDays: 30,
        discreetMode: false,
      }),
    ).toMatchObject({
      last_period_start: '2026-10-10',
      last_period_unknown: false,
      cycle_length_days: 30,
    });
  });
});

describe('validatePeriodDates', () => {
  const today = '2026-10-28';

  it('accepts an ongoing or finished period in the past', () => {
    expect(validatePeriodDates('2026-10-24', null, today)).toBeNull();
    expect(validatePeriodDates('2026-10-20', '2026-10-24', today)).toBeNull();
    expect(validatePeriodDates('2026-10-28', '2026-10-28', today)).toBeNull();
  });

  it('rejects future dates', () => {
    expect(validatePeriodDates('2026-10-29', null, today)).toBe('cycle.errors.future');
    expect(validatePeriodDates('2026-10-24', '2026-10-30', today)).toBe('cycle.errors.future');
  });

  it('rejects an end before the start', () => {
    expect(validatePeriodDates('2026-10-24', '2026-10-20', today)).toBe(
      'cycle.errors.endBeforeStart',
    );
  });
});

describe('newId', () => {
  it('makes distinct v4 uuids', () => {
    const a = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newId()).not.toBe(a);
  });
});

describe('buildPhaseRequest', () => {
  const settings = { last_period_start: '2026-09-01', cycle_length_days: 30 };

  it('uses the newest logged start, the cycle length and the latest finished period length', () => {
    expect(
      buildPhaseRequest({
        periods: [
          { id: 'c', started_on: '2026-10-26', ended_on: null },
          { id: 'b', started_on: '2026-09-28', ended_on: '2026-10-04' },
          { id: 'a', started_on: '2026-08-30', ended_on: '2026-09-02' },
        ],
        settings,
      }),
    ).toEqual({ last_period_start: '2026-10-26', cycle_length_days: 30, period_length_days: 7 });
  });

  it('falls back to the setup start and leaves unknown lengths to the backend', () => {
    expect(
      buildPhaseRequest({ periods: [], settings: { ...settings, cycle_length_days: null } }),
    ).toEqual({ last_period_start: '2026-09-01' });
  });

  it('leaves out lengths the endpoint would reject', () => {
    expect(
      buildPhaseRequest({
        periods: [{ id: 'a', started_on: '2026-10-01', ended_on: '2026-10-14' }],
        settings: { cycle_length_days: 60 },
      }),
    ).toEqual({ last_period_start: '2026-10-01' });
  });

  it('asks for nothing without a known start', () => {
    expect(buildPhaseRequest({ periods: [], settings: { last_period_unknown: true } })).toBeNull();
    expect(buildPhaseRequest({ periods: [], settings: null })).toBeNull();
  });
});

describe('fetchCyclePhase', () => {
  it('posts the body and keeps the backend wording as returned', async () => {
    const phase = {
      phase: 'ovulatory',
      phase_day: 2,
      cycle_day: 14,
      days_until_next_period: 15,
      days_until_next_phase: 4,
      next_period_date: '2026-11-15',
      next_phase: 'luteal',
      description: 'You are at peak fertility.',
      symptoms: ['heightened senses'],
      tips: ['Zinc-rich foods support ovarian health'],
    };
    mockFetch.mockResolvedValueOnce(phase);
    await expect(fetchCyclePhase({ last_period_start: '2026-10-18' })).resolves.toEqual(phase);
    expect(mockFetch).toHaveBeenCalledWith('/cycle/phase', {
      method: 'POST',
      body: { last_period_start: '2026-10-18' },
      signal: undefined,
    });
  });

  it('rejects a phase it does not know', async () => {
    mockFetch.mockResolvedValueOnce({ phase: 'unknown' });
    await expect(fetchCyclePhase({ last_period_start: '2026-10-18' })).rejects.toThrow();
  });
});
