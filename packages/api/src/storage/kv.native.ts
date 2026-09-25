import { createMMKV } from 'react-native-mmkv';
import type { KeyValueStore } from './kv';

// MMKV: synchronous, fast, non-sensitive data only (preferences, query cache, offline queue).
// Secrets (auth session) go through secure-store instead.
const mmkv = createMMKV({ id: 'aurora' });

export const kv: KeyValueStore = {
  get: (key) => mmkv.getString(key) ?? null,
  set: (key, value) => mmkv.set(key, value),
  remove: (key) => {
    mmkv.remove(key);
  },
};
