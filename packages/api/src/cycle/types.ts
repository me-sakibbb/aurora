// Proposed addition to `GET /api/v1/ovulation` for the phase view (F10). The backend is building
// it; until it ships the Cycle tab shows sample data with a "Preview" badge. The phase is worked
// out by the backend, never in the app.

export type CyclePhaseKey = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type CurrentPhase = {
  phase: CyclePhaseKey;
  /** Day of the current cycle, counting the period's first day as 1. */
  day_of_cycle: number | null;
  /** Plain-language wording written by the backend, shown in full when present. */
  note: string | null;
};
