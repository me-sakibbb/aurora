// Small synchronous key-value store for non-sensitive preferences (language, discreet mode…).
// Web: localStorage. Native: MMKV (kv.native.ts).

export type KeyValueStore = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

const hasLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false; // Private mode / blocked storage throws on access.
  }
};

export const kv: KeyValueStore = {
  get: (key) => {
    if (!hasLocalStorage()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota exceeded or blocked; preferences are best-effort on web.
    }
  },
  remove: (key) => {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};
