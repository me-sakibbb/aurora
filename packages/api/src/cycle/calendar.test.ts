import { daysBetween, periodDays, periodOn } from './calendar';

const periods = [
  { id: 'b', started_on: '2026-10-26', ended_on: null },
  { id: 'a', started_on: '2026-09-28', ended_on: '2026-10-02' },
];

describe('daysBetween', () => {
  it('includes both ends and crosses months', () => {
    expect(daysBetween('2026-09-29', '2026-10-01')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ]);
  });
});

describe('periodDays', () => {
  it('marks logged days in the month, an ongoing period up to today', () => {
    const days = periodDays(periods, { from: '2026-10-01', to: '2026-10-31', today: '2026-10-28' });
    expect([...days].sort()).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ]);
  });
});

describe('periodOn', () => {
  it('finds the period a day belongs to', () => {
    expect(periodOn(periods, '2026-10-01', '2026-10-28')?.id).toBe('a');
    expect(periodOn(periods, '2026-10-27', '2026-10-28')?.id).toBe('b');
    expect(periodOn(periods, '2026-10-29', '2026-10-28')).toBeUndefined();
    expect(periodOn(periods, '2026-10-10', '2026-10-28')).toBeUndefined();
  });
});
