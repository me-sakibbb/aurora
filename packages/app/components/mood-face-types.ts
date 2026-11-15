import type { MoodLevel } from '@mybela/api';
import { moodColor, tokenColor } from '../lib/token-color';

export type MoodFaceProps = {
  level: MoodLevel;
  size: number;
  /** Greyed out (e.g. the faces not picked once one is). */
  dimmed?: boolean;
};

/**
 * The drawn face for each mood level, on a 48×48 grid: brows and mouth change shape from a soft
 * frown (1) to an open smile (5). Shared by the web (inline SVG) and native (react-native-svg)
 * twins so both draw exactly the same face.
 */
export type FaceShape = {
  fill: string;
  ink: string;
  /** Eye dots, or happy closed-eye arcs (stroked paths) at level 5. */
  eyes: { kind: 'dots'; points: [number, number][] } | { kind: 'arcs'; paths: string[] };
  brows: string[];
  mouth: { d: string; filled: boolean };
};

const DOTS: [number, number][] = [
  [17, 21],
  [31, 21],
];

export function faceShape(level: MoodLevel): FaceShape {
  const fill = moodColor(level);
  const ink = tokenColor('olive');
  switch (level) {
    case 1:
      return {
        fill,
        ink,
        eyes: { kind: 'dots', points: DOTS },
        // Inner ends raised: a sad, not angry, brow.
        brows: ['M12.5 16.5 L20 14', 'M28 14 L35.5 16.5'],
        mouth: { d: 'M16.5 34 Q24 27 31.5 34', filled: false },
      };
    case 2:
      return {
        fill,
        ink,
        eyes: { kind: 'dots', points: DOTS },
        brows: [],
        mouth: { d: 'M17 32.5 Q24 29 31 32.5', filled: false },
      };
    case 3:
      return {
        fill,
        ink,
        eyes: { kind: 'dots', points: DOTS },
        brows: [],
        mouth: { d: 'M17.5 31 L30.5 31', filled: false },
      };
    case 4:
      return {
        fill,
        ink,
        eyes: { kind: 'dots', points: DOTS },
        brows: [],
        mouth: { d: 'M16 29 Q24 36 32 29', filled: false },
      };
    case 5:
      return {
        fill,
        ink,
        eyes: { kind: 'arcs', paths: ['M13.5 22 Q17 17.5 20.5 22', 'M27.5 22 Q31 17.5 34.5 22'] },
        brows: [],
        mouth: { d: 'M15 28 Q24 41 33 28 Z', filled: true },
      };
  }
}
