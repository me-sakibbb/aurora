import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Platform, type ViewProps } from 'react-native';

// Same registration as fade-in.tsx (repeating it is harmless), so Pop can take `className`.
cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/**
 * Springs its children in (a small overshoot) each time `active` turns on. Skips the first render
 * (an answer that was already picked) unless `appear` is set (content that just mounted).
 */
export function Pop({
  active = true,
  appear = false,
  style,
  ...props
}: ViewProps & { active?: boolean; appear?: boolean }) {
  const scale = useRef(new Animated.Value(appear ? 0.8 : 1)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (!appear) return;
    }
    if (!active) return;
    scale.setValue(0.8);
    const animation = Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 220,
      useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [active, scale]);

  return <Animated.View style={[{ transform: [{ scale }] }, style]} {...props} />;
}
