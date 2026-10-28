import { nextRange } from './range';

describe('nextRange', () => {
  it('sets the start, then the end', () => {
    const first = nextRange({ start: null, end: null }, '2026-10-22');
    expect(first).toEqual({ start: '2026-10-22', end: null });
    expect(nextRange(first, '2026-10-26')).toEqual({ start: '2026-10-22', end: '2026-10-26' });
  });

  it('allows a one-day period', () => {
    expect(nextRange({ start: '2026-10-22', end: null }, '2026-10-22')).toEqual({
      start: '2026-10-22',
      end: '2026-10-22',
    });
  });

  it('moves the start when an earlier day is tapped', () => {
    expect(nextRange({ start: '2026-10-22', end: null }, '2026-10-20')).toEqual({
      start: '2026-10-20',
      end: null,
    });
  });

  it('starts over once both ends are set', () => {
    expect(nextRange({ start: '2026-10-22', end: '2026-10-26' }, '2026-10-24')).toEqual({
      start: '2026-10-24',
      end: null,
    });
  });
});
