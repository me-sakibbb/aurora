'use client';

import { useTranslation } from '@mybela/i18n';
import { CloudCheck, cn, Icon, Text, WifiOff } from '@mybela/ui';
import { useIsMutating, useMutationState } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useIsOnline } from '../../lib/use-online';

type Status = 'hidden' | 'offline' | 'syncing' | 'synced';

/** How long "All changes synced" stays before the strip folds away. */
const SYNCED_MS = 2500;

/**
 * F15: one place, under the top bar of every signed-in screen, that says when the connection is
 * gone and what happens to things saved meanwhile.
 *
 * - Offline: "You're offline" + how many changes are waiting on this device (or that saved data
 *   is being shown).
 * - Back online with changes waiting: "Syncing your changes…" while they're sent.
 * - Then briefly "All changes synced", and the strip goes away.
 *
 * Ordinary saves made while online never show it; only writes that had to wait do.
 */
export function useConnectionStatus() {
  const online = useIsOnline();
  // Writes saved on the device, waiting for a connection (paused mutations).
  const queued = useMutationState({
    filters: { status: 'pending', predicate: (m) => m.state.isPaused },
  }).length;
  const sending = useIsMutating();
  const [status, setStatus] = useState<Status>(online ? 'hidden' : 'offline');
  const hadQueue = useRef(false);

  useEffect(() => {
    if (!online) {
      if (queued > 0) hadQueue.current = true;
      setStatus('offline');
      return;
    }
    if (hadQueue.current) {
      if (sending > 0 || queued > 0) {
        setStatus('syncing');
      } else {
        hadQueue.current = false;
        setStatus('synced');
      }
      return;
    }
    setStatus((current) => (current === 'synced' ? current : 'hidden'));
  }, [online, queued, sending]);

  useEffect(() => {
    if (status !== 'synced') return;
    const timer = setTimeout(() => setStatus('hidden'), SYNCED_MS);
    return () => clearTimeout(timer);
  }, [status]);

  return { status, queued };
}

export function ConnectionStatus() {
  const { t } = useTranslation();
  const { status, queued } = useConnectionStatus();
  if (status === 'hidden') return null;

  const message =
    status === 'offline'
      ? queued > 0
        ? t('connection.offlineQueued', { count: queued })
        : t('connection.offlineCached')
      : status === 'syncing'
        ? t('connection.syncing')
        : t('connection.synced');

  return (
    <FadeIn
      key={status}
      className={cn(
        'border-border border-b px-5 py-2',
        status === 'offline' ? 'bg-muted' : status === 'synced' ? 'bg-accent/15' : 'bg-card',
      )}
    >
      <View
        className="mx-auto w-full max-w-6xl flex-row items-center gap-2.5"
        role="status"
        aria-live="polite"
      >
        {status === 'syncing' ? (
          <ActivityIndicator size="small" className="text-muted-foreground" />
        ) : (
          <Icon
            as={status === 'offline' ? WifiOff : CloudCheck}
            size={16}
            className={status === 'synced' ? 'text-foreground' : 'text-muted-foreground'}
          />
        )}
        <Text className="flex-1 text-[13px] leading-5" numberOfLines={2}>
          {status === 'offline' ? (
            <Text className="text-[13px] font-semibold">{t('connection.offline')} </Text>
          ) : null}
          <Text className="text-muted-foreground text-[13px]">{message}</Text>
        </Text>
      </View>
    </FadeIn>
  );
}
