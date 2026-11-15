import type { MoodLevel } from '@mybela/api';
import { moodColor, tokenColor } from '../lib/token-color';

export type MoonPhaseProps = {
  /** 1 = a thin crescent (slept very poorly) … 5 = a full moon (slept very well). */
  level: MoodLevel;
  size: number;
  /** Drawn on a dark (primary) surface. */
  inverted?: boolean;
};

/** How much of the moon is lit for each sleep answer. */
const LIT: Record<MoodLevel, number> = { 1: 0.12, 2: 0.32, 3: 0.5, 4: 0.75, 5: 1 };

const R = 18;
const C = 24;

/**
 * The lit part of the moon on a 48×48 grid: the right half-disc plus a terminator ellipse that
 * bulges right (crescent) or left (gibbous). Shared by the web and native twins.
 */
export function moonShape(level: MoodLevel, inverted: boolean) {
  const lit = LIT[level];
  const rx = Math.abs(1 - 2 * lit) * R;
  const sweep = lit > 0.5 ? 1 : 0;
  const d =
    lit >= 1
      ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C} ${C + R} A ${R} ${R} 0 1 1 ${C} ${C - R} Z`
      : `M ${C} ${C - R} A ${R} ${R} 0 0 1 ${C} ${C + R} A ${rx} ${R} 0 0 ${sweep} ${C} ${C - R} Z`;
  return {
    d,
    r: R,
    c: C,
    lit: moodColor(5),
    // The unlit disc: a faint olive on light cards, a faint ivory on the dark selected tile.
    dark: inverted ? tokenColor('ivory') : tokenColor('olive'),
    darkOpacity: inverted ? 0.22 : 0.16,
  };
}
