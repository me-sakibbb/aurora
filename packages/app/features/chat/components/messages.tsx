'use client';

import { type ChatMessage, hasBengaliScript } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { cn, Icon, RefreshCw, Text, TriangleAlert, X } from '@mybela/ui';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { memo, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { useDateLocale } from '../../home/use-date-locale';
import { type PendingMessage, useChatStore } from '../queries';
import { AssistantAvatar } from './avatar';
import { BODY_TEXT, Markdown } from './markdown';

/** What the person wrote: a bubble on the right. */
export const UserBubble = memo(function UserBubble({
  content,
  muted = false,
}: {
  content: string;
  muted?: boolean;
}) {
  const bengali = hasBengaliScript(content);
  return (
    <View className="items-end pl-12">
      <View
        className={cn('bg-primary rounded-[22px] rounded-br-md px-4 py-2.5', muted && 'opacity-60')}
      >
        <Text
          selectable
          className={cn(bengali ? BODY_TEXT.bn : BODY_TEXT.en, 'text-primary-foreground')}
        >
          {content}
        </Text>
      </View>
    </View>
  );
});

/**
 * MyBela's reply, full width under its mark (no bubble, so long answers read like a page).
 * A reply that just arrived fades in block by block, once.
 */
export const AssistantMessage = memo(function AssistantMessage({
  message,
}: {
  message: ChatMessage;
}) {
  const { t } = useTranslation();
  const fresh = useChatStore((s) => Boolean(s.fresh[message.id]));
  const clearFresh = useChatStore((s) => s.clearFresh);
  // Reveal once: leaving and coming back shows it at rest.
  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => clearFresh(message.id), 2000);
    return () => clearTimeout(timer);
  }, [fresh, clearFresh, message.id]);

  const body = (
    <View className="gap-2 pr-2">
      <View className="flex-row items-center gap-2">
        <AssistantAvatar />
        <Text className="text-sm font-semibold">{t('common.appName')}</Text>
      </View>
      <Markdown
        source={message.content}
        bengali={hasBengaliScript(message.content)}
        reveal={fresh}
      />
    </View>
  );
  return fresh ? <FadeIn>{body}</FadeIn> : body;
});

/** A message on its way, or one that didn't go through (kept, with retry and discard). */
export function PendingBubble({
  message,
  onRetry,
  onDiscard,
  canRetry,
}: {
  message: PendingMessage;
  onRetry: () => void;
  onDiscard: () => void;
  canRetry: boolean;
}) {
  const { t } = useTranslation();
  const failed = message.status === 'failed';
  return (
    <FadeIn className="gap-1.5">
      <UserBubble content={message.content} muted={failed} />
      {failed ? (
        <View className="flex-row items-center justify-end gap-1" role="alert">
          <Icon as={TriangleAlert} size={14} className="text-destructive" />
          <Text className="text-destructive text-xs font-medium">
            {t(
              message.error === 'timeout'
                ? 'chat.failed.timeout'
                : message.error === 'offline'
                  ? 'chat.failed.offline'
                  : 'chat.failed.generic',
            )}
          </Text>
          <Pressable
            onPress={onRetry}
            disabled={!canRetry}
            role="button"
            aria-label={t('common.retry')}
            hitSlop={6}
            className={cn(
              'ml-1 flex-row items-center gap-1 rounded-full px-2 py-1 active:opacity-60',
              !canRetry && 'opacity-40',
            )}
          >
            <Icon as={RefreshCw} size={13} className="text-foreground" />
            <Text className="text-xs font-semibold">{t('common.retry')}</Text>
          </Pressable>
          <Pressable
            onPress={onDiscard}
            role="button"
            aria-label={t('chat.failed.discard')}
            hitSlop={6}
            className="rounded-full p-1 active:opacity-60"
          >
            <Icon as={X} size={14} className="text-muted-foreground" />
          </Pressable>
        </View>
      ) : null}
    </FadeIn>
  );
}

/** "Today", "Yesterday" or the date, between days of a conversation. */
export function DaySeparator({ day }: { day: string }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const date = parseISO(day);
  const label = isToday(date)
    ? t('chat.today')
    : isYesterday(date)
      ? t('chat.yesterday')
      : format(date, 'd MMMM yyyy', { locale });
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="bg-border h-px flex-1" />
      <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {label}
      </Text>
      <View className="bg-border h-px flex-1" />
    </View>
  );
}
