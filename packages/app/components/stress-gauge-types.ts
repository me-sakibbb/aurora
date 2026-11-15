import { MOOD_LEVELS, type MoodLevel } from '@mybela/api';
import { tokenColor } from '../lib/token-color';

export type StressGaugeProps = {
  /** The picked answer, or null for an empty dial. */
  value: MoodLevel | null;
  /** Rendered width; the height is `width * GAUGE.height / GAUGE.width`. */
  width: number;
};

/** The dial's drawing grid (a half circle sitting on its flat side). */
export const GAUGE = { width: 240, height: 136, cx: 120, cy: 120, r: 96, stroke: 24 } as const;

/** Each segment's share of the 180° arc, minus a small gap between segments. */
const SPAN = 180 / MOOD_LEVELS.length;
const GAP = 2;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A point on the arc at `deg` (180 = far left, 90 = top, 0 = far right), `r` from the centre. */
export function gaugePoint(deg: number, r: number = GAUGE.r) {
  return { x: GAUGE.cx + r * Math.cos(rad(deg)), y: GAUGE.cy - r * Math.sin(rad(deg)) };
}

/** The middle of a level's segment, in degrees. Used for the needle and for the tap targets. */
export function segmentMid(level: MoodLevel) {
  return 180 - SPAN * (level - 0.5);
}

/**
 * The five segments, left (calm) to right (very stressed). Each gets darker, so "more" reads at a
 * glance. The picked one is drawn solid and thicker; the others stay soft.
 */
export function gaugeShape(value: MoodLevel | null) {
  const ink = tokenColor('olive');
  const segments = MOOD_LEVELS.map((level) => {
    const from = gaugePoint(180 - SPAN * (level - 1) - GAP / 2);
    const to = gaugePoint(180 - SPAN * level + GAP / 2);
    const picked = value === level;
    return {
      level,
      d: `M ${from.x} ${from.y} A ${GAUGE.r} ${GAUGE.r} 0 0 1 ${to.x} ${to.y}`,
      color: ink,
      // Unpicked segments stay light (still darkening left→right) so the pick clearly stands out.
      opacity: picked ? 1 : 0.1 + 0.07 * level,
      width: picked ? GAUGE.stroke + 8 : GAUGE.stroke,
    };
  });
  const tip = value ? gaugePoint(segmentMid(value), GAUGE.r - GAUGE.stroke - 8) : null;
  return { ink, segments, tip };
}
