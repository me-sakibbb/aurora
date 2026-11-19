// F17 Mood Pattern Insights: `GET /api/v1/mood/insights?from&to` (Bearer auth, own entries).
// The backend writes `observation` (one or two plain sentences, from its model or a fixed
// fallback); the app shows it exactly as written, never as a chart or score.

export type MoodInsight = {
  /** `not_enough_data` when nothing was checked in during the range. */
  status: 'ready' | 'not_enough_data';
  /** The backend's sentence, shown in full. */
  text: string;
  /** Check-ins in the range, as the backend counted them. */
  days_logged: number;
};
