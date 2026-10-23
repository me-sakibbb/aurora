'use client';

import {
  FOOD_PAGE_SIZE,
  type FoodItem,
  fetchFoodCatalogue,
  fetchFoodPage,
  isApiConfigured,
  kv,
  matchCatalogue,
  mergeResults,
  methodIgnored,
  normalizeQuery,
  offsetIgnored,
} from '@aurora/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useIsOnline } from '../../lib/use-online';

export const foodCatalogueQueryKey = ['food', 'catalogue'];

/** Shortest query sent to the backend; shorter ones only match on the device. */
const MIN_SERVER_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Every food, persisted with the query cache. Powers instant/offline search and stands in for
 * server paging while the backend ignores `offset` / `cooking_method` (see @aurora/api food).
 */
export function useFoodCatalogue() {
  return useQuery({
    queryKey: foodCatalogueQueryKey,
    queryFn: fetchFoodCatalogue,
    enabled: isApiConfigured(),
    staleTime: 60 * 60_000,
  });
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * What this session has learned about the backend's paging: once it's seen ignoring `offset` or
 * `cooking_method`, lists stop asking and page through the cached catalogue instead.
 */
const usePagingSupport = create<{
  offsetIgnored: boolean;
  methodIgnored: boolean;
  learn: (patch: Partial<{ offsetIgnored: boolean; methodIgnored: boolean }>) => void;
}>((set) => ({
  offsetIgnored: false,
  methodIgnored: false,
  learn: (patch) => set(patch),
}));

/**
 * An infinitely scrolling food list. Shows a page at a time; scrolling near the end reveals the
 * next page, fetching it from the backend when needed. `local` items (device matches, or the
 * catalogue when server paging isn't available) come first; the backend's pages are appended.
 */
function usePagedFoods({
  search,
  method,
  enabled,
  local,
  resetKey,
}: {
  search?: string;
  method?: string | null;
  enabled: boolean;
  local: (serverPaging: boolean) => FoodItem[];
  /** Changing it starts again from the first page. */
  resetKey: string;
}) {
  const support = usePagingSupport();
  const learn = usePagingSupport((s) => s.learn);
  const [shown, setShown] = useState({ key: resetKey, size: FOOD_PAGE_SIZE });
  const size = shown.key === resetKey ? shown.size : FOOD_PAGE_SIZE;
  const methodBlocked = Boolean(method) && support.methodIgnored;

  const server = useInfiniteQuery({
    queryKey: ['food', 'pages', search ?? '', method ?? ''],
    queryFn: ({ pageParam, signal }) =>
      fetchFoodPage({ offset: pageParam, search, method }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages, lastOffset) =>
      last.length < FOOD_PAGE_SIZE || offsetIgnored(pages)
        ? undefined
        : lastOffset + FOOD_PAGE_SIZE,
    enabled: enabled && isApiConfigured() && !methodBlocked,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const pages = server.data?.pages;
  useEffect(() => {
    if (!pages) return;
    if (offsetIgnored(pages)) learn({ offsetIgnored: true });
    if (method && pages[0] && methodIgnored(pages[0], method)) learn({ methodIgnored: true });
  }, [pages, method, learn]);

  const usable = enabled && !methodBlocked && pages !== undefined;
  // Server paging works until proven otherwise; without an answer yet, the device fills in.
  const serverPaging = usable && !support.offsetIgnored;
  const localItems = local(serverPaging);
  const items = useMemo(
    () => mergeResults(localItems, usable ? pages?.flat() : undefined),
    [localItems, usable, pages],
  );

  const moreOnServer = serverPaging && server.hasNextPage;
  const hasMore = size < items.length || moreOnServer;
  const loadMore = useCallback(() => {
    if (size < items.length) setShown({ key: resetKey, size: size + FOOD_PAGE_SIZE });
    if (moreOnServer && !server.isFetchingNextPage && size + FOOD_PAGE_SIZE >= items.length) {
      void server.fetchNextPage();
      setShown({ key: resetKey, size: size + FOOD_PAGE_SIZE });
    }
  }, [size, items.length, moreOnServer, server, resetKey]);

  return {
    items: items.slice(0, size),
    hasMore,
    loadMore,
    loadingMore: server.isFetchingNextPage,
    server,
  };
}

/**
 * Browsing with an empty search box: every food, or one cooking method, page by page.
 */
export function useFoodBrowse(method: string | null) {
  const catalogue = useFoodCatalogue();
  const local = useCallback(
    (serverPaging: boolean) =>
      serverPaging
        ? []
        : (catalogue.data ?? []).filter((item) => !method || item.cooking_method === method),
    [catalogue.data, method],
  );
  const list = usePagedFoods({ method, enabled: true, local, resetKey: method ?? '' });
  const loading =
    list.items.length === 0 &&
    ((catalogue.isPending && catalogue.fetchStatus !== 'idle') || list.server.isFetching);
  return {
    ...list,
    catalogue,
    loading,
    failed: list.items.length === 0 && !loading && (catalogue.isError || list.server.isError),
    retry: () => {
      void catalogue.refetch();
      void list.server.refetch();
    },
  };
}

/**
 * Hybrid search (F5): instant matches from the cached catalogue on every keystroke, then the
 * backend's matches (debounced, stale requests cancelled) appended page by page as you scroll.
 * Offline it stays on the device.
 */
export function useFoodSearch(query: string) {
  const online = useIsOnline();
  const catalogue = useFoodCatalogue();
  const normalized = normalizeQuery(query);
  const deferred = useDeferredValue(query);
  const debounced = useDebounced(normalized, SEARCH_DEBOUNCE_MS);
  // Only use the backend's answer for what's in the box now, not for a few keystrokes ago.
  const current = debounced === normalized;

  const matches = useMemo(
    () => matchCatalogue(catalogue.data ?? [], deferred),
    [catalogue.data, deferred],
  );
  const local = useCallback(() => matches, [matches]);
  const list = usePagedFoods({
    search: debounced,
    enabled: current && online && debounced.length >= MIN_SERVER_QUERY,
    local,
    resetKey: normalized,
  });

  const firstPage = list.server.isFetching && !list.server.isFetchingNextPage;
  const waiting = online && normalized.length >= MIN_SERVER_QUERY && (!current || firstPage);

  return {
    /** What's typed, trimmed and normalized; empty means the idle state. */
    normalized,
    results: list.items,
    hasMore: list.hasMore,
    loadMore: list.loadMore,
    loadingMore: list.loadingMore,
    catalogue,
    /** The backend hasn't answered for the current text yet. */
    waiting,
    /** The backend search failed; results are the device's matches only. */
    serverFailed: current && list.server.isError,
    retryServer: () => void list.server.refetch(),
  };
}

const MAX_RECENT = 8;

type RecentFoodsState = {
  items: FoodItem[];
  add: (item: FoodItem) => void;
  clear: () => void;
};

/** Foods looked at recently, newest first, kept on the device for one-tap access. */
export const useRecentFoods = create<RecentFoodsState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: [item, ...s.items.filter((other) => other.id !== item.id)].slice(0, MAX_RECENT),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'aurora.food.recent',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: kv.get,
        setItem: kv.set,
        removeItem: kv.remove,
      })),
      partialize: ({ items }) => ({ items }),
    },
  ),
);
