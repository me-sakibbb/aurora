import type { Period } from './api';

// Turning logged data into calendar marks. Nothing is predicted: a period covers the days that
// were logged (an ongoing one runs up to today), and the fertile window is the backend's range.

function addDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Every day from `start` to `end` inclusive (`yyyy-MM-dd`). */
export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDay(day)) days.push(day);
  return days;
}

/** The logged period a day belongs to, if any. */
export function periodOn(periods: readonly Period[], day: string, today: string) {
  return periods.find((p) => p.started_on <= day && day <= (p.ended_on ?? today));
}

/** The days covered by logged periods, limited to `from`–`to`. */
export function periodDays(
  periods: readonly Period[],
  { from, to, today }: { from: string; to: string; today: string },
): Set<string> {
  const days = new Set<string>();
  for (const p of periods) {
    const start = p.started_on > from ? p.started_on : from;
    const last = p.ended_on ?? today;
    const end = last < to ? last : to;
    if (start > end) continue;
    for (const day of daysBetween(start, end)) days.add(day);
  }
  return days;
}
