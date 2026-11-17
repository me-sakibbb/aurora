'use client';

import type { ChatMessage } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { ChevronDown, Icon } from '@mybela/ui';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  type ListRenderItem,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Skeleton } from '../../components/skeleton';
import { useInsets } from '../../lib/insets';
import { useSearchParam } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { useCycleAccess } from '../cycle/queries';
import { InlineState } from '../home/components/primitives';
import { useAccount } from '../shell/account';
import { Composer } from './components/composer';
import { AssistantMessage, DaySeparator, PendingBubble, UserBubble } from './components/messages';
import { TypingIndicator } from './components/typing';
import { ChatWelcome } from './components/welcome';
import {
  type PendingMessage,
  useActiveThread,
  useChatSender,
  useChatStore,
  useThreadMessages,
} from './queries';

type Row =
  | { key: string; type: 'message'; message: ChatMessage }
  | { key: string; type: 'pending'; message: PendingMessage }
  | { key: string; type: 'typing'; since: string }
  | { key: string; type: 'day'; day: string };

const dayOf = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

/**
 * Newest first (the list is inverted, so the newest sits at the bottom by the composer), with a
 * date line above the first message of each day.
 */
function buildRows(stored: ChatMessage[], pending: PendingMessage[], complete: boolean): Row[] {
  const items: { createdAt: string; row: Row }[] = [];
  const sending = pending.find((m) => m.status === 'sending');
  if (sending)
    items.push({ createdAt: '', row: { key: 'typing', type: 'typing', since: sending.createdAt } });
  for (const message of [...pending].reverse()) {
    items.push({
      createdAt: message.createdAt,
      row: { key: message.id, type: 'pending', message },
    });
  }
  for (const message of stored) {
    items.push({
      createdAt: message.createdAt,
      row: { key: message.id, type: 'message', message },
    });
  }

  const rows: Row[] = [];
  items.forEach((item, index) => {
    rows.push(item.row);
    if (!item.createdAt) return;
    const older = items.slice(index + 1).find((next) => next.createdAt);
    const day = dayOf(item.createdAt);
    // Close a day when the next older message is from another day, or at the very start.
    if (older ? dayOf(older.createdAt) !== day : complete) {
      rows.push({ key: `day-${day}-${index}`, type: 'day', day });
    }
  });
  return rows;
}

/** Prefills from `?q=` are taken once, so coming back to the tab doesn't re-insert them. */
let consumedPrefill: string | undefined;

/**
 * F16 "Ask MyBela": ask anything, in English, Bengali or a mix, and MyBela answers in kind. Opens
 * on the latest conversation (stored by the backend); "New chat" in the top bar starts fresh.
 * The backend decides everything about a reply; the app shows it as returned.
 */
export function ChatScreen() {
  const { t } = useTranslation();
  const insets = useInsets();
  const online = useIsOnline();
  const { firstName } = useAccount();
  const cycleEnabled = useCycleAccess() === 'enabled';
  const prefill = useSearchParam('q');

  const { threadId, latest, resolving } = useActiveThread();
  const messages = useThreadMessages(threadId);
  const sender = useChatSender(threadId);
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);

  const listRef = useRef<FlatList<Row>>(null);
  const [showJump, setShowJump] = useState(false);

  // "Ask MyBela about this" (Home) opens a fresh conversation with the question ready to send.
  useEffect(() => {
    if (!prefill || prefill === consumedPrefill) return;
    consumedPrefill = prefill;
    useChatStore.getState().setThread(null);
    setDraft(prefill);
  }, [prefill, setDraft]);

  const stored = useMemo(() => messages.data?.pages.flat() ?? [], [messages.data]);
  const rows = useMemo(
    () => buildRows(stored, sender.pending, !messages.hasNextPage),
    [stored, sender.pending, messages.hasNextPage],
  );

  const send = useCallback(
    (text: string) => {
      if (sender.send(text)) {
        setDraft('');
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    },
    [sender, setDraft],
  );

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({ item }) => {
      switch (item.type) {
        case 'typing':
          return <TypingIndicator since={item.since} />;
        case 'day':
          return <DaySeparator day={item.day} />;
        case 'pending':
          return (
            <PendingBubble
              message={item.message}
              canRetry={!sender.busy && online}
              onRetry={() => sender.retry(item.message.id)}
              onDiscard={() => sender.discard(item.message.id)}
            />
          );
        default:
          return item.message.role === 'user' ? (
            <UserBubble content={item.message.content} />
          ) : (
            <AssistantMessage message={item.message} />
          );
      }
    },
    [sender, online],
  );

  const loadingThread =
    (resolving && latest.isLoading) ||
    (threadId !== null && messages.data === undefined && messages.isLoading);
  const failed =
    (resolving && latest.isError) ||
    (threadId !== null && messages.data === undefined && messages.isError);
  const empty = rows.length === 0;

  let body: React.ReactNode;
  if (empty && failed) {
    body = (
      <View className="mx-auto w-full max-w-md flex-1 justify-center px-5">
        <InlineState
          error={latest.error ?? messages.error}
          onRetry={() => void (resolving ? latest.refetch() : messages.refetch())}
        />
      </View>
    );
  } else if (empty && resolving && !online) {
    body = (
      <View className="mx-auto w-full max-w-md flex-1 justify-center px-5">
        <InlineState kind="offline" />
      </View>
    );
  } else if (empty && loadingThread) {
    body = <ThreadSkeleton />;
  } else if (empty) {
    body = (
      <ChatWelcome
        name={firstName}
        cycleEnabled={cycleEnabled}
        onAsk={send}
        disabled={sender.busy || !online}
      />
    );
  } else {
    body = (
      <FlatList
        ref={listRef}
        data={rows}
        inverted
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onEndReached={() => {
          if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onScroll={(event) => setShowJump(event.nativeEvent.contentOffset.y > 480)}
        scrollEventThrottle={64}
        ListFooterComponent={
          messages.isFetchingNextPage ? <ActivityIndicator className="py-3" /> : null
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      // The screen starts below the shell's top bar.
      keyboardVerticalOffset={insets.top + 56}
    >
      <View className="flex-1">
        {body}
        {showJump && !empty ? (
          <FadeIn className="absolute bottom-3 self-center">
            <Pressable
              onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
              role="button"
              aria-label={t('chat.jumpToLatest')}
              className="bg-card border-border h-10 w-10 items-center justify-center rounded-full border shadow-md shadow-black/10 active:opacity-80"
            >
              <Icon as={ChevronDown} size={20} className="text-foreground" />
            </Pressable>
          </FadeIn>
        ) : null}
      </View>
      <View className="mx-auto w-full max-w-2xl px-3 pb-3 pt-1.5">
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send(draft)}
          busy={sender.busy}
          online={online}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/** First load of a stored conversation, shaped like one. */
function ThreadSkeleton() {
  return (
    <View className="mx-auto w-full max-w-2xl flex-1 justify-end gap-5 px-5 py-5" aria-busy>
      <Skeleton className="h-11 w-2/3 self-end rounded-[22px]" />
      <View className="gap-2">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-3/5 rounded-md" />
      </View>
      <Skeleton className="h-11 w-1/2 self-end rounded-[22px]" />
    </View>
  );
}
