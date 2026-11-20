'use client';

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useReducedMotion } from '../../../lib/use-reduced-motion';

const useNativeDriver = Platform.OS !== 'web';

/**
 * A soft light band sweeping down and up over the photo while the dish is being matched, with
 * the photo dimmed a little so the band reads. Reduced motion: a still tint only.
 */
export function ScanOverlay() {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || height === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(sweep, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, height, sweep]);

  const band = 56;
  const translateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-band, height] });

  return (
    <View
      aria-hidden
      pointerEvents="none"
      className="bg-olive/25 absolute inset-0 overflow-hidden"
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {reduced ? null : (
        <Animated.View
          style={{ height: band, transform: [{ translateY }] }}
          className="w-full justify-end"
        >
          <View className="bg-ivory/25 h-10 w-full" />
          <View className="bg-ivory h-0.5 w-full" />
        </Animated.View>
      )}
    </View>
  );
}
