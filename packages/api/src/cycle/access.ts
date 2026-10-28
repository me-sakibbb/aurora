/**
 * Who sees cycle tracking (F13):
 * - `enabled`: the backend says the account opted in → the Cycle tab and its content.
 * - `eligible`: not opted in, but the profile's sex is female or other → the Cycle tab is offered
 *   and opening it asks the setup questions. Nothing about fertility is shown yet.
 * - `hidden`: everyone else, and while either answer is still unknown (loading, error, no profile).
 *
 * The sex check stands in until the backend returns an eligibility flag of its own.
 */
export type CycleAccess = 'enabled' | 'eligible' | 'hidden';

export function cycleAccess(
  enabled: boolean | undefined,
  sex: 'female' | 'male' | 'other' | null | undefined,
): CycleAccess {
  if (enabled === true) return 'enabled';
  if (enabled === false && (sex === 'female' || sex === 'other')) return 'eligible';
  return 'hidden';
}
