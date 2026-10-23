import type { MealSlot } from './api';

// Shapes the Home dashboard expects for sections the backend has no endpoint for yet (week
// activity, insights, recent logs, mood). They double as the proposed API contract: every number
// and sentence here is meant to come from the backend, displayed as returned.

/** A calorie estimate is always a range, never a single number (F5/F6). */
export type KcalRange = { min: number; max: number };

export type WeekActivity = {
  /** Oldest first, ending today. */
  days: { date: string; logged: boolean }[];
  /** F22 logging streak. */
  streak_days: number;
  /** F19 Flex Day chips available. */
  flex_chips: number;
};

/** F20 "Aurora noticed" card and the F4 insights summary: written by the backend. */
export type Insight = { id: string; title: string; body: string };

export type RecentLog = {
  id: string;
  name: string;
  name_bn: string | null;
  meal_slot: MealSlot;
  /** ISO timestamp. */
  logged_at: string;
  kcal: KcalRange;
};

/** F12: today's check-in, if there is one. */
export type MoodToday = { mood: 1 | 2 | 3 | 4 | 5 | null };
