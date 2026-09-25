// Native: the same MMKV instance as kv, exposed through the async interface the persister expects.
import type { AsyncStore } from './async-store';
import { kv } from './kv';

export const asyncStore: AsyncStore = {
  getItem: async (key) => kv.get(key),
  setItem: async (key, value) => kv.set(key, value),
  removeItem: async (key) => kv.remove(key),
};
