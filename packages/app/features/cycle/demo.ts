import type { CurrentPhase } from '@aurora/api';

// SAMPLE DATA for the phase card until `GET /ovulation` returns the current phase (the backend is
// building it). Fixed content, not derived from the person's logs; see packages/api/src/cycle/types.ts.
export const DEMO_PHASE: CurrentPhase = { phase: 'follicular', day_of_cycle: 9, note: null };
