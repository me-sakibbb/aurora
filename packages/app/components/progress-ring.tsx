'use client';

// Web: plain inline SVG with a CSS transition (keeps react-native-svg out of the web bundle).
// Native twin: progress-ring.native.tsx. Same props.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from '../lib/use-reduced-motion';
import type { ProgressRingProps } from './progress-ring-types';

export type { ProgressRingProps } from './progress-ring-types';

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
  // Start empty and fill on the next frame so the CSS transition plays on mount.
  const [shown, setShown] = useState(reduced ? clamped : 0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeOpacity={trackOpacity}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
          style={{
            transition: reduced
              ? undefined
              : 'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
      {children}
    </View>
  );
}
