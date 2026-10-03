import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The OS "reduce motion" setting (Android: Remove animations; web: prefers-reduced-motion).
 * Celebrations skip confetti and big movement when it's on.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => active && setReduced(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub?.remove();
    };
  }, []);

  return reduced;
}
