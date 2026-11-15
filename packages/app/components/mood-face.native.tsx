// Native: react-native-svg. Web twin: mood-face.tsx. Same props, same shapes (mood-face-types.ts).
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { faceShape, type MoodFaceProps } from './mood-face-types';

export type { MoodFaceProps } from './mood-face-types';

export function MoodFace({ level, size, dimmed = false }: MoodFaceProps) {
  const face = faceShape(level);
  return (
    <View style={{ width: size, height: size, opacity: dimmed ? 0.45 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx={24} cy={24} r={24} fill={face.fill} />
        <G
          stroke={face.ink}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {face.brows.map((d) => (
            <Path key={d} d={d} />
          ))}
          {face.eyes.kind === 'arcs' ? face.eyes.paths.map((d) => <Path key={d} d={d} />) : null}
          <Path d={face.mouth.d} fill={face.mouth.filled ? face.ink : 'none'} />
        </G>
        {face.eyes.kind === 'dots'
          ? face.eyes.points.map(([cx, cy]) => (
              <Circle key={cx} cx={cx} cy={cy} r={2.6} fill={face.ink} />
            ))
          : null}
      </Svg>
    </View>
  );
}
