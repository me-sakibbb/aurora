import { cn } from '@aurora/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, type ViewProps } from 'react-native';
import { useReducedMotion } from '../lib/use-reduced-motion';

cssInterop(Animated.View, { className: 'style' });

/** A softly pulsing placeholder block, so loading screens keep their shape instead of going blank. */
export function Skeleton({ className, style, ...props }: ViewProps & { className?: string }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      aria-hidden
      className={cn('bg-muted rounded-lg', className)}
      style={[{ opacity: pulse }, style]}
      {...props}
    />
  );
}
