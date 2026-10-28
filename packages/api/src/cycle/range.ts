/**
 * Marking a period on a calendar: the first tap sets the start, the next tap on a later day (or
 * the same day) sets the end, and a tap before the start moves the start. Once both are set, a
 * tap starts over. Dates are `yyyy-MM-dd`, so they compare as strings.
 */
export function nextRange(
  range: { start: string | null; end: string | null },
  tapped: string,
): { start: string; end: string | null } {
  const { start, end } = range;
  if (start === null || end !== null || tapped < start) return { start: tapped, end: null };
  return { start, end: tapped };
}
