import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from './backend';
import { asyncStore } from './storage/async-store';

const DAY = 1000 * 60 * 60 * 24;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Must be ≥ persister maxAge, otherwise restored cache is garbage-collected immediately.
        gcTime: DAY,
        // Network drops, rate limits and server errors are retried; a 4xx answer won't change.
        retry: (failures, error) => failures < 2 && isRetryable(error),
        // Back off (2s, 4s…) so a struggling or rate-limiting backend isn't hammered (F15).
        retryDelay: (attempt) => Math.min(1000 * 2 ** (attempt + 1), 15_000),
        // Serve cached data when offline (Dhaka mobile data drops often) instead of erroring.
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Mutations made offline are paused, persisted, and resumed when back online.
        // For this to survive an app restart, register each one with
        // queryClient.setMutationDefaults(key, { mutationFn }) — see docs/architecture.md.
        networkMode: 'offlineFirst',
        retry: (failures, error) => failures < 3 && isRetryable(error),
        retryDelay: (attempt) => Math.min(1000 * 2 ** (attempt + 1), 15_000),
      },
    },
  });
}

/** Persists the query cache and the paused (offline) mutation queue. MMKV on native, IndexedDB on web. */
export const queryPersister = createAsyncStoragePersister({
  storage: asyncStore,
  key: 'aurora-query-cache',
  throttleTime: 1000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: DAY,
  // Bump when cached data shapes change incompatibly, so old caches are discarded.
  buster: 'v1',
};
