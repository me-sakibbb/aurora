import { z } from 'zod';
import { apiFetch } from '../backend';
import { getSupabase } from '../supabase';

// Cycle tracking (F10, F11, F13). Settings and the fertile-window estimate come from the FastAPI
// `/ovulation` endpoints; period start/end dates live in Supabase `cycle_logs` (RLS: own rows only),
// since the backend has no cycle-log endpoints yet. Nothing is estimated in the app.

const settingsSchema = z.object({
  last_period_start: z.string().nullish(),
  last_period_unknown: z.boolean().nullish(),
  cycle_length_days: z.number().nullish(),
  discreet_mode: z.boolean().nullish(),
});

const fertileWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  confidence: z.string().nullish(),
  /** Explanatory wording written by the backend. Shown in full when present. */
  note: z.string().nullish(),
});

const cycleStatusSchema = z.object({
  enabled: z.boolean(),
  ovulation: settingsSchema.nullish(),
  fertility_window: fertileWindowSchema.nullish(),
});

export type CycleSettings = z.infer<typeof settingsSchema>;
export type FertileWindow = z.infer<typeof fertileWindowSchema>;
export type CycleStatus = z.infer<typeof cycleStatusSchema>;

/**
 * `GET /api/v1/ovulation`. `enabled` says whether the account opted in (F13). Only the fertile
 * window's start and end are kept (Zod drops `ovulation_start`/`ovulation_end`): the app never
 * shows a single predicted day (F11).
 */
export async function fetchCycleStatus(): Promise<CycleStatus> {
  return cycleStatusSchema.parse(await apiFetch('/ovulation'));
}

export const CYCLE_LENGTH = { min: 21, max: 45, default: 28 } as const;

export type CycleSetupInput = {
  userId: string;
  /** `yyyy-MM-dd`, or null when the person doesn't remember. */
  lastPeriodStart: string | null;
  /** 21–45, or null when the person isn't sure. */
  cycleLengthDays: number | null;
  /** Show the estimated fertile window (F11). Undefined leaves it as it is. */
  fertilityEstimate?: boolean;
  /** The currently stored value, sent back unchanged (the endpoint resets it to false otherwise). */
  discreetMode: boolean;
};

/** The body for `POST /api/v1/ovulation` when turning tracking on or changing its settings. */
export function buildCycleSettingsBody(input: CycleSetupInput) {
  return {
    enabled: true,
    last_period_start: input.lastPeriodStart,
    last_period_unknown: input.lastPeriodStart === null,
    cycle_length_days: input.cycleLengthDays,
    discreet_mode: input.discreetMode,
  };
}

/**
 * Turns cycle tracking on (or updates its settings) and records the fertile-window opt-in.
 * The backend has no input for the opt-in, so it's written to the person's own `profiles` row.
 * Safe to replay: both writes are idempotent.
 */
export async function saveCycleSetup(input: CycleSetupInput): Promise<void> {
  await apiFetch('/ovulation', { method: 'POST', body: buildCycleSettingsBody(input) });
  if (input.fertilityEstimate !== undefined) {
    await setFertilityEstimate(input.userId, input.fertilityEstimate);
  }
}

/** Turns cycle tracking off. Logged periods are kept; the backend only clears the opt-in. */
export async function turnOffCycle(): Promise<void> {
  await apiFetch('/ovulation', { method: 'POST', body: { enabled: false } });
}

/** Writes `profiles.wants_fertility_estimate`. Fails when there's no profile row to update. */
export async function setFertilityEstimate(userId: string, on: boolean): Promise<void> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({ wants_fertility_estimate: on })
    .eq('id', userId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No profile to update.');
}

// ─── Periods (`cycle_logs`) ──────────────────────────────────────────────────────────────────────

export const PERIOD_PAGE_SIZE = 20;

export type Period = {
  id: string;
  /** `yyyy-MM-dd`. */
  started_on: string;
  /** `yyyy-MM-dd`, or null while it's ongoing. */
  ended_on: string | null;
};

/** One page of the person's periods, newest first. */
export async function fetchPeriodPage({
  userId,
  offset,
}: {
  userId: string;
  offset: number;
}): Promise<Period[]> {
  const { data, error } = await getSupabase()
    .from('cycle_logs')
    .select('id, started_on, ended_on')
    .eq('user_id', userId)
    .order('started_on', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PERIOD_PAGE_SIZE - 1);
  if (error) throw error;
  return data;
}

/** Periods that overlap `from`–`to` (inclusive, `yyyy-MM-dd`), for marking a calendar month. */
export async function fetchPeriodsBetween({
  userId,
  from,
  to,
}: {
  userId: string;
  from: string;
  to: string;
}): Promise<Period[]> {
  const { data, error } = await getSupabase()
    .from('cycle_logs')
    .select('id, started_on, ended_on')
    .eq('user_id', userId)
    .lte('started_on', to)
    .or(`ended_on.gte.${from},ended_on.is.null`)
    .order('started_on', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Creates or updates a period. The id is made on the device, so replaying the write after a
 * dropped connection updates the same row instead of adding a second one.
 */
export async function savePeriod({ userId, ...period }: Period & { userId: string }) {
  const { error } = await getSupabase()
    .from('cycle_logs')
    .upsert({ ...period, user_id: userId }, { onConflict: 'id' });
  if (error) throw error;
}

/** Permanently deletes a period (F10: a genuine delete, not a hidden flag). */
export async function deletePeriod(id: string) {
  const { error } = await getSupabase().from('cycle_logs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Basic date checks before saving, so mistakes show up right away: no future dates, and the end
 * can't be before the start. Returns an i18n key, or null when the dates are fine.
 */
export function validatePeriodDates(
  startedOn: string,
  endedOn: string | null,
  today: string,
): 'cycle.errors.future' | 'cycle.errors.endBeforeStart' | null {
  if (startedOn > today || (endedOn !== null && endedOn > today)) return 'cycle.errors.future';
  if (endedOn !== null && endedOn < startedOn) return 'cycle.errors.endBeforeStart';
  return null;
}
