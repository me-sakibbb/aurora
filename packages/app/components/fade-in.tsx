import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, type ViewProps } from 'react-native';

// NativeWind doesn't register Animated.View by default; this lets FadeIn take `className`.
cssInterop(Animated.View, { className: 'style' });

/**
 * Gentle fade + rise on mount. Give it a `key` to replay when content swaps (e.g. form → message).
 * `from` slides it in sideways instead (step forward → from the right, back → from the left).
 * Plain RN Animated (not Reanimated) so it behaves the same on react-native-web.
 */
export function FadeIn({
  delay = 0,
  from = 'below',
  style,
  ...props
}: ViewProps & { delay?: number; from?: 'below' | 'right' | 'left' }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: from === 'below' ? 280 : 340,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, from]);

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'below' ? 8 : from === 'right' ? 28 : -28, 0],
  });
  const transform = from === 'below' ? [{ translateY: offset }] : [{ translateX: offset }];
  return <Animated.View style={[{ opacity: progress, transform }, style]} {...props} />;
}
