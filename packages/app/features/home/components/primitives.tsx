'use client';

import { type ErrorKind, errorKind, type MealSlot } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import {
  Button,
  ChevronRight,
  Cookie,
  cn,
  Eye,
  EyeOff,
  Icon,
  type IconComponent,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Text,
  TriangleAlert,
  WifiOff,
} from '@mybela/ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Skeleton } from '../../../components/skeleton';
import { useIsOnline } from '../../../lib/use-online';

export const MEAL_ICONS: Record<MealSlot, IconComponent> = {
  breakfast: Sunrise,
  lunch: Sun,
  snack: Cookie,
  dinner: Moon,
};

/** The standard Home card surface. */
export function Panel({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      className={cn(
        'bg-card border-border rounded-3xl border p-5 shadow-sm shadow-black/5',
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  badge,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-2 px-1">
      <Text role="heading" aria-level={2} className="text-lg font-bold tracking-tight">
        {title}
      </Text>
      {badge}
      <View className="flex-1" />
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          className="-mr-1 flex-row items-center gap-0.5 rounded-full px-2 py-1 active:opacity-60"
        >
          <Text className="text-muted-foreground text-sm font-semibold">{action}</Text>
          <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Marks a section that shows sample content because its backend endpoint doesn't exist yet,
 * so nobody mistakes it for their own data. Goes away with the demo data.
 */
export function PreviewBadge({ tone = 'light' }: { tone?: 'light' | 'olive' }) {
  const { t } = useTranslation();
  return (
    <View
      className={cn('rounded-full px-2 py-0.5', tone === 'olive' ? 'bg-ivory/15' : 'bg-taupe/40')}
    >
      <Text
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider',
          tone === 'olive' ? 'text-ivory/80' : 'text-olive',
        )}
      >
        {t('home.preview')}
      </Text>
    </View>
  );
}

/**
 * Discreet Mode (F25): sensitive cards (cycle, mood) stay covered until deliberately opened.
 * Revealing lasts until the screen is left.
 */
export function Veil({
  hidden,
  label,
  children,
}: {
  hidden: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  if (!hidden || revealed) return <>{children}</>;
  return (
    <Pressable
      onPress={() => setRevealed(true)}
      aria-label={t('home.discreet.reveal', { section: label })}
      className="bg-card border-border active:bg-muted flex-row items-center gap-4 rounded-3xl border border-dashed p-5"
    >
      <View className="bg-muted h-11 w-11 items-center justify-center rounded-2xl">
        <Icon as={EyeOff} size={20} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold">{label}</Text>
        <Text variant="muted">{t('home.discreet.hidden')}</Text>
      </View>
      <Icon as={Eye} size={20} className="text-muted-foreground" />
    </Pressable>
  );
}

/**
 * An in-card loading failure with a retry, used instead of hiding the section (F15). Pass the
 * query's `error` and the message says what kind of problem it is (offline, too many requests,
 * server trouble); `kind="offline"` forces the offline wording.
 */
export function InlineState({
  kind,
  error,
  onRetry,
}: {
  kind?: 'error' | 'offline';
  error?: unknown;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const online = useIsOnline();
  const resolved: ErrorKind = kind === 'offline' ? 'offline' : errorKind(error, online);
  const offline = resolved === 'offline';
  return (
    <Panel className="items-center gap-3 py-8">
      <View className="bg-muted h-12 w-12 items-center justify-center rounded-2xl">
        <Icon as={offline ? WifiOff : TriangleAlert} size={22} className="text-muted-foreground" />
      </View>
      <Text className="text-muted-foreground max-w-xs text-center leading-6" role="alert">
        {t(STATE_MESSAGE[resolved])}
      </Text>
      {!offline && onRetry ? (
        <Button variant="outline" size="sm" className="rounded-full" onPress={onRetry}>
          <Icon as={RefreshCw} size={14} />
          <Text>{t('common.retry')}</Text>
        </Button>
      ) : null}
    </Panel>
  );
}

const STATE_MESSAGE = {
  offline: 'states.offline',
  rateLimited: 'states.rateLimited',
  server: 'states.server',
  notFound: 'states.error',
  unknown: 'states.error',
} as const satisfies Record<ErrorKind, string>;

/** First-load placeholder for the whole dashboard, shaped like the real thing. */
export function HomeSkeleton() {
  return (
    <View aria-busy className="gap-5">
      <View className="gap-2 px-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-56" />
      </View>
      <Skeleton className="h-64 rounded-[28px]" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1 rounded-3xl" />
        <Skeleton className="h-24 flex-1 rounded-3xl" />
        <Skeleton className="h-24 flex-1 rounded-3xl" />
      </View>
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-44 rounded-3xl" />
    </View>
  );
}
