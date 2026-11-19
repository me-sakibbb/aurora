// Shapes the Home dashboard expects for sections the backend has no endpoint for yet (streak,
// flex chips, noticed). They double as the proposed API contract: every number
// and sentence here is meant to come from the backend, displayed as returned.

/** A calorie estimate is always a range, never a single number (F5/F6). */
export type KcalRange = { min: number; max: number };

/** The logged days per week come from `GET /calories/insights`; these two have no source yet. */
export type WeekActivity = {
  /** F22 logging streak. */
  streak_days: number;
  /** F19 Flex Day chips available. */
  flex_chips: number;
};

/** F20 "MyBela noticed" card: written by the backend. */
export type Insight = { id: string; title: string; body: string };
