// Native: react-native-svg. Web twin: moon-phase.tsx. Same props, same shape (moon-phase-types.ts).
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { type MoonPhaseProps, moonShape } from './moon-phase-types';

export type { MoonPhaseProps } from './moon-phase-types';

export function MoonPhase({ level, size, inverted = false }: MoonPhaseProps) {
  const moon = moonShape(level, inverted);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle
          cx={moon.c}
          cy={moon.c}
          r={moon.r}
          fill={moon.dark}
          fillOpacity={moon.darkOpacity}
        />
        <Path d={moon.d} fill={moon.lit} />
      </Svg>
    </View>
  );
}
