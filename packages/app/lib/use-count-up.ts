import { useEffect, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Animates a displayed number from 0 up to `target` (ease-out) on mount and whenever it changes.
 * Presentation only: the target itself comes from the backend.
 */
export function useCountUp(target: number, durationMs = 900) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduced]);

  return value;
}
