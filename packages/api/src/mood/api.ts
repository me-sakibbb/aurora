import { z } from 'zod';
import { apiFetch } from '../backend';

// Daily mood check-in (F12): FastAPI `POST /mood` (create or replace that day's entry) and
// `GET /mood?from&to&limit` (newest first). One entry per person per calendar day, so saving the
// same day again updates it instead of duplicating, and an offline replay is harmless.

export const MOOD_LEVELS = [1, 2, 3, 4, 5] as const;
export type MoodLevel = (typeof MOOD_LEVELS)[number];

/** The 1–5 scales besides mood. All optional; mood itself is the only required answer. */
export const MOOD_SCALES = ['energy', 'sleep', 'stress'] as const;
export type MoodScale = (typeof MOOD_SCALES)[number];

/**
 * The quick tags people can pick, stored as these English slugs (the labels are translated in the
 * app). A fixed list keeps the data clean for the backend's pattern insights (F17); the backend
 * accepts any string, so this list is the contract to share with them.
 */
export const MOOD_TAGS = [
  'work',
  'study',
  'family',
  'friends',
  'partner',
  'exercise',
  'outdoors',
  'rest',
  'food',
  'travel',
  'unwell',
  'period',
] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

/** The backend's limit for the optional note. */
export const MOOD_NOTE_MAX = 2000;
export const MOOD_PAGE_SIZE = 20;

const level = z.coerce.number().int().min(1).max(5);
const optionalLevel = level.nullish().transform((value) => (value ?? null) as MoodLevel | null);

const moodLogSchema = z.object({
  /** `yyyy-MM-dd`, the person's calendar day. */
  day: z.string(),
  mood: level.transform((value) => value as MoodLevel),
  energy: optionalLevel,
  sleep: optionalLevel,
  stress: optionalLevel,
  tags: z
    .array(z.string())
    .nullish()
    // Unknown tags (an older or newer app) are kept out of the UI rather than shown as raw slugs.
    .transform((tags) =>
      (tags ?? []).filter((tag): tag is MoodTag => (MOOD_TAGS as readonly string[]).includes(tag)),
    ),
  note: z
    .string()
    .nullish()
    .transform((note) => note ?? null),
});

export type MoodLog = z.infer<typeof moodLogSchema>;
export type MoodLogInput = MoodLog;

const listSchema = z.object({ logs: z.array(moodLogSchema) });

/** `POST /mood`: saves the day's check-in, replacing any earlier one for that day. */
export async function saveMoodLog(input: MoodLogInput): Promise<MoodLog> {
  const note = input.note?.trim();
  const json = await apiFetch('/mood', {
    method: 'POST',
    body: {
      day: input.day,
      mood: input.mood,
      energy: input.energy,
      sleep: input.sleep,
      stress: input.stress,
      tags: input.tags,
      note: note ? note.slice(0, MOOD_NOTE_MAX) : null,
    },
  });
  return moodLogSchema.parse(json);
}

/** Entries with `day` in [from, to] (inclusive), newest first. */
export async function fetchMoodBetween(
  { from, to }: { from: string; to: string },
  signal?: AbortSignal,
): Promise<MoodLog[]> {
  const params = new URLSearchParams({ from, to, limit: '62' });
  const json = await apiFetch(`/mood?${params}`, { signal });
  return listSchema.parse(json).logs;
}

/**
 * One page of the history, newest first. `before` is the oldest day already shown (exclusive);
 * the backend has no cursor, so the next page asks for days up to the one before it.
 */
export async function fetchMoodPage(
  { before }: { before?: string },
  signal?: AbortSignal,
): Promise<MoodLog[]> {
  const params = new URLSearchParams({ limit: String(MOOD_PAGE_SIZE) });
  if (before) params.set('to', previousDay(before));
  const json = await apiFetch(`/mood?${params}`, { signal });
  return listSchema.parse(json).logs;
}

/** The calendar day before a `yyyy-MM-dd` day (no timezone involved). */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
}
