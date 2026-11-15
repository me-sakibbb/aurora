'use client';

// Web: plain inline SVG (keeps react-native-svg out of the web bundle).
// Native twin: mood-face.native.tsx. Same props, same shapes (mood-face-types.ts).
import { View } from 'react-native';
import { faceShape, type MoodFaceProps } from './mood-face-types';

export type { MoodFaceProps } from './mood-face-types';

export function MoodFace({ level, size, dimmed = false }: MoodFaceProps) {
  const face = faceShape(level);
  return (
    <View style={{ width: size, height: size, opacity: dimmed ? 0.45 : 1 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        style={{ filter: dimmed ? 'grayscale(0.6)' : undefined, transition: 'filter 200ms' }}
      >
        <circle cx={24} cy={24} r={24} fill={face.fill} />
        <g
          stroke={face.ink}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {face.brows.map((d) => (
            <path key={d} d={d} />
          ))}
          {face.eyes.kind === 'arcs' ? face.eyes.paths.map((d) => <path key={d} d={d} />) : null}
          <path d={face.mouth.d} fill={face.mouth.filled ? face.ink : 'none'} />
        </g>
        {face.eyes.kind === 'dots'
          ? face.eyes.points.map(([cx, cy]) => (
              <circle key={cx} cx={cx} cy={cy} r={2.6} fill={face.ink} />
            ))
          : null}
      </svg>
    </View>
  );
}
