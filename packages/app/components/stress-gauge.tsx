'use client';

// Web: inline SVG. Native twin: stress-gauge.native.tsx. Same props, same shapes.
import { View } from 'react-native';
import { GAUGE, gaugeShape, type StressGaugeProps } from './stress-gauge-types';

export type { StressGaugeProps } from './stress-gauge-types';

export function StressGauge({ value, width }: StressGaugeProps) {
  const gauge = gaugeShape(value);
  const height = (width * GAUGE.height) / GAUGE.width;
  return (
    <View style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}
        aria-hidden="true"
        focusable="false"
      >
        {gauge.segments.map((s) => (
          <path
            key={s.level}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeOpacity={s.opacity}
            strokeWidth={s.width}
            style={{ transition: 'stroke-width 180ms, stroke-opacity 180ms' }}
          />
        ))}
        {gauge.tip ? (
          <line
            x1={GAUGE.cx}
            y1={GAUGE.cy}
            x2={gauge.tip.x}
            y2={gauge.tip.y}
            stroke={gauge.ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ) : null}
        <circle cx={GAUGE.cx} cy={GAUGE.cy} r={9} fill={gauge.ink} />
      </svg>
    </View>
  );
}
