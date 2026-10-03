// Web: the Vibration API where it exists (Android browsers); elsewhere a no-op.
// Native twin: haptics.native.ts.

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Blocked before the first user gesture; nothing to do.
    }
  }
}

/** A light tick, for picking an answer. */
export function tapHaptic() {
  vibrate(8);
}

/** A success pattern, for celebrations. */
export function successHaptic() {
  vibrate([12, 60, 20]);
}
