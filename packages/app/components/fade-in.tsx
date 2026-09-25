import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Platform, type ViewProps } from 'react-native';

// NativeWind doesn't register Animated.View by default; this lets FadeIn take `className`.
cssInterop(Animated.View, { className: 'style' });

/**
 * Gentle fade + rise on mount. Give it a `key` to replay when content swaps (e.g. form → message).
 * Plain RN Animated (not Reanimated) so it behaves the same on react-native-web.
 */
export function FadeIn({ delay = 0, style, ...props }: ViewProps & { delay?: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]} {...props} />
  );
}
