// Async store backing the persisted query cache + offline mutation queue on web: IndexedDB.
// (localStorage is ~5MB and blocks the main thread; IndexedDB is neither.)
import { del, get, set } from 'idb-keyval';

export type AsyncStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const asyncStore: AsyncStore = {
  getItem: async (key) => (await get<string>(key)) ?? null,
  setItem: (key, value) => set(key, value),
  removeItem: (key) => del(key),
};
