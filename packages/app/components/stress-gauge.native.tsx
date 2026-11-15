// Native: react-native-svg. Web twin: stress-gauge.tsx. Same props, same shapes.
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { GAUGE, gaugeShape, type StressGaugeProps } from './stress-gauge-types';

export type { StressGaugeProps } from './stress-gauge-types';

export function StressGauge({ value, width }: StressGaugeProps) {
  const gauge = gaugeShape(value);
  const height = (width * GAUGE.height) / GAUGE.width;
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}>
        {gauge.segments.map((s) => (
          <Path
            key={s.level}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeOpacity={s.opacity}
            strokeWidth={s.width}
          />
        ))}
        {gauge.tip ? (
          <Line
            x1={GAUGE.cx}
            y1={GAUGE.cy}
            x2={gauge.tip.x}
            y2={gauge.tip.y}
            stroke={gauge.ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={GAUGE.cx} cy={GAUGE.cy} r={9} fill={gauge.ink} />
      </Svg>
    </View>
  );
}
