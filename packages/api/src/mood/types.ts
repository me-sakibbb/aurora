// PROPOSED CONTRACT for F17 Mood Pattern Insights. The backend has no endpoint for this yet; the
// app shows sample content marked "Preview" until it ships. Share this with the backend team.
//
//   GET /api/v1/mood/insights            (Bearer auth, the signed-in person's own entries)
//   200 → MoodInsight
//
// The backend finds the pattern and writes the sentence; the app shows `observation` (or, while
// there isn't enough to go on, `message`) exactly as written, never as a chart or score.

export type MoodInsight = {
  status: 'ready' | 'not_enough_data';
  /** One plain-language sentence, e.g. "You've tended to feel calmer on days you got outside." */
  observation: string | null;
  /** The honest "not enough yet" wording when `status` is `not_enough_data`. */
  message: string | null;
  /** ISO timestamp of when the observation was written. */
  updated_at: string;
};
