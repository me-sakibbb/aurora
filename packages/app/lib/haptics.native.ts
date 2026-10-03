import * as Haptics from 'expo-haptics';

// Native: expo-haptics. Web twin: haptics.ts. Fire-and-forget; a device without a motor just
// does nothing.

/** A light tick, for picking an answer. */
export function tapHaptic() {
  void Haptics.selectionAsync().catch(() => {});
}

/** A success pattern, for celebrations. */
export function successHaptic() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
