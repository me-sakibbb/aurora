'use client';

// Web: inline SVG. Native twin: moon-phase.native.tsx. Same props, same shape (moon-phase-types.ts).
import { View } from 'react-native';
import { type MoonPhaseProps, moonShape } from './moon-phase-types';

export type { MoonPhaseProps } from './moon-phase-types';

export function MoonPhase({ level, size, inverted = false }: MoonPhaseProps) {
  const moon = moonShape(level, inverted);
  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <circle
          cx={moon.c}
          cy={moon.c}
          r={moon.r}
          fill={moon.dark}
          fillOpacity={moon.darkOpacity}
        />
        <path d={moon.d} fill={moon.lit} />
      </svg>
    </View>
  );
}
