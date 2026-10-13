// Native: react-native-svg, animated with RN Animated. Web twin: progress-ring.tsx. Same props.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useReducedMotion } from '../lib/use-reduced-motion';
import type { ProgressRingProps } from './progress-ring-types';

export type { ProgressRingProps } from './progress-ring-types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  trackOpacity = 1,
  children,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      value.setValue(clamped);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: clamped,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      // strokeDashoffset is an SVG prop, not a transform/opacity, so the native driver can't run it.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, reduced, value]);

  const offset = value.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeOpacity={trackOpacity}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      {children}
    </View>
  );
}
