import type { MoodLevel } from '@mybela/api';

/** `/mood/check-in` for a day (default today), optionally starting with a mood picked. */
export function checkInHref({ day, mood }: { day?: string; mood?: MoodLevel } = {}) {
  const params = new URLSearchParams();
  if (day) params.set('day', day);
  if (mood) params.set('mood', String(mood));
  const query = params.toString();
  return query ? `/mood/check-in?${query}` : '/mood/check-in';
}
