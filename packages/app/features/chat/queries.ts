'use client';

import {
  CHAT_PAGE_SIZE,
  type ChatMessage,
  type ChatThread,
  type ErrorKind,
  errorKind,
  fetchLatestThread,
  fetchThreadMessages,
  isSupabaseConfigured,
  kv,
  sendChatMessage,
} from '@mybela/api';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { successHaptic, tapHaptic } from '../../lib/haptics';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { dailySummaryQueryKey } from '../home/queries';

// Ask MyBela (F16). Stored messages come from Supabase and live in the query cache (persisted, so
// the last conversation shows instantly and offline). A reply is written into that cache as soon
// as it arrives, so cache and server never disagree. Messages still on their way, or that failed,
// live in the store below; failed ones are kept on the device so nothing typed is lost (F15).

type MessagePages = InfiniteData<ChatMessage[], string | null>;

export const chatQueryKey = (userId: string | undefined) => ['chat', userId];
const latestThreadKey = (userId: string | undefined) => ['chat', userId, 'latest'];
const messagesKey = (userId: string | undefined, threadId: string) => [
  'chat',
  userId,
  'messages',
  threadId,
];

export type PendingMessage = {
  id: string;
  content: string;
  createdAt: string;
  /** The conversation it belongs to; `null` = a new one. */
  threadId: string | null;
  status: 'sending' | 'failed';
  error?: ErrorKind | 'timeout';
};

type ChatState = {
  /** `undefined` = follow the latest conversation; `null` = a new one; else that conversation. */
  threadId: string | null | undefined;
  pending: PendingMessage[];
  /** Replies that arrived while the screen was open; they're revealed with a little motion. */
  fresh: Record<string, true>;
  /** Typed but not sent yet (kept across restarts). */
  draft: string;
  setThread: (threadId: string | null | undefined) => void;
  setDraft: (draft: string) => void;
  addPending: (message: PendingMessage) => void;
  updatePending: (id: string, patch: Partial<PendingMessage>) => void;
  removePending: (id: string) => void;
  markFresh: (id: string) => void;
  clearFresh: (id: string) => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threadId: undefined,
      pending: [],
      fresh: {},
      draft: '',
      setThread: (threadId) => set({ threadId }),
      setDraft: (draft) => set({ draft }),
      addPending: (message) => set((s) => ({ pending: [...s.pending, message] })),
      updatePending: (id, patch) =>
        set((s) => ({ pending: s.pending.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removePending: (id) => set((s) => ({ pending: s.pending.filter((m) => m.id !== id) })),
      markFresh: (id) => set((s) => ({ fresh: { ...s.fresh, [id]: true } })),
      clearFresh: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.fresh;
          return { fresh: rest };
        }),
    }),
    {
      name: 'aurora.chat',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: kv.get,
        setItem: kv.set,
        removeItem: kv.remove,
      })),
      // A message that was still sending when the app closed never got its reply: keep it as failed.
      partialize: ({ draft, pending }) => ({
        draft,
        pending: pending.map((m) => ({ ...m, status: 'failed' as const })),
      }),
    },
  ),
);

/** Starts a new conversation; the previous one stays stored on the backend. */
export function startNewChat() {
  useChatStore.getState().setThread(null);
}

/** The conversation being shown: the latest one unless a new one was started. */
export function useActiveThread() {
  const userId = useSession()?.user.id;
  const chosen = useChatStore((s) => s.threadId);
  const latest = useQuery<ChatThread | null>({
    queryKey: latestThreadKey(userId),
    queryFn: fetchLatestThread,
    enabled: Boolean(userId) && isSupabaseConfigured() && chosen === undefined,
    staleTime: 60_000,
  });
  const threadId = chosen === undefined ? (latest.data?.id ?? null) : chosen;
  return { threadId, latest, resolving: chosen === undefined && latest.data === undefined };
}

/** The conversation's stored messages, newest first; scrolling up loads older pages. */
export function useThreadMessages(threadId: string | null) {
  const userId = useSession()?.user.id;
  return useInfiniteQuery({
    queryKey: messagesKey(userId, threadId ?? 'none'),
    queryFn: ({ pageParam }) => fetchThreadMessages(threadId as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.length < CHAT_PAGE_SIZE ? undefined : (last[last.length - 1]?.createdAt ?? undefined),
    enabled: Boolean(userId && threadId) && isSupabaseConfigured(),
    staleTime: 30_000,
  });
}

/** Writes a finished exchange into the cache, newest first, as the server now stores it. */
function appendExchange(
  queryClient: QueryClient,
  userId: string | undefined,
  threadId: string,
  messages: ChatMessage[],
) {
  queryClient.setQueryData<MessagePages>(messagesKey(userId, threadId), (data) => {
    if (!data) return { pages: [messages], pageParams: [null] };
    const [first = [], ...rest] = data.pages;
    return { ...data, pages: [[...messages, ...first], ...rest] };
  });
}

let localId = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(localId++).toString(36)}`;

/** Sending a message, retrying a failed one, and what's in flight for the shown conversation. */
export function useChatSender(threadId: string | null) {
  const userId = useSession()?.user.id;
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const allPending = useChatStore((s) => s.pending);
  const pending = useMemo(
    () => allPending.filter((m) => m.threadId === threadId),
    [allPending, threadId],
  );
  const busy = pending.some((m) => m.status === 'sending');

  const deliver = useCallback(
    async (message: PendingMessage) => {
      const store = useChatStore.getState();
      store.updatePending(message.id, { status: 'sending', error: undefined });
      try {
        const result = await sendChatMessage({
          message: message.content,
          conversationId: message.threadId,
        });
        const now = new Date().toISOString();
        const replyId = nextId('reply');
        appendExchange(queryClient, userId, result.conversationId, [
          { id: replyId, role: 'assistant', content: result.reply, createdAt: now },
          {
            id: nextId('sent'),
            role: 'user',
            content: message.content,
            createdAt: message.createdAt,
          },
        ]);
        const latest: ChatThread = { id: result.conversationId, title: null, updatedAt: now };
        queryClient.setQueryData(latestThreadKey(userId), latest);
        const state = useChatStore.getState();
        state.removePending(message.id);
        state.markFresh(replyId);
        // Stay on this conversation (a new one gets its id from the backend now).
        if (state.threadId === message.threadId || state.threadId === undefined) {
          state.setThread(result.conversationId);
        }
        successHaptic();
        // MyBela can log a meal from the chat; refresh what that would change.
        void queryClient.invalidateQueries({ queryKey: dailySummaryQueryKey(userId) });
        void queryClient.invalidateQueries({ queryKey: ['meal-suggestions', userId] });
      } catch (error) {
        const kind =
          error instanceof Error &&
          'status' in error &&
          (error as { status: number }).status === 408
            ? 'timeout'
            : errorKind(error, online);
        useChatStore.getState().updatePending(message.id, { status: 'failed', error: kind });
      }
    },
    [queryClient, userId, online],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || busy) return false;
      tapHaptic();
      const message: PendingMessage = {
        id: nextId('pending'),
        content,
        createdAt: new Date().toISOString(),
        threadId,
        status: 'sending',
      };
      useChatStore.getState().addPending(message);
      void deliver(message);
      return true;
    },
    [busy, deliver, threadId],
  );

  const retry = useCallback(
    (id: string) => {
      const message = useChatStore.getState().pending.find((m) => m.id === id);
      if (message && !busy) void deliver(message);
    },
    [busy, deliver],
  );

  const discard = useCallback((id: string) => useChatStore.getState().removePending(id), []);

  return { pending, busy, send, retry, discard };
}
