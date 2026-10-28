import { cycleAccess } from './access';

describe('cycleAccess', () => {
  it('shows everything to opted-in accounts', () => {
    expect(cycleAccess(true, 'female')).toBe('enabled');
    expect(cycleAccess(true, undefined)).toBe('enabled');
  });

  it('offers the setup to women and other, not men', () => {
    expect(cycleAccess(false, 'female')).toBe('eligible');
    expect(cycleAccess(false, 'other')).toBe('eligible');
    expect(cycleAccess(false, 'male')).toBe('hidden');
  });

  it('hides while anything is unknown', () => {
    expect(cycleAccess(undefined, 'female')).toBe('hidden');
    expect(cycleAccess(false, null)).toBe('hidden');
    expect(cycleAccess(false, undefined)).toBe('hidden');
  });
});
