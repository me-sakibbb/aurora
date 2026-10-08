'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, cn, Text } from '@aurora/ui';
import { ActivityIndicator, View } from 'react-native';
import { BrandMark } from './brand-mark';
import { FadeIn } from './fade-in';

/** Full-screen brand splash used while the session / account state is being worked out. */
export function AppSplash({ message, className }: { message?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <View className={cn('bg-background flex-1 items-center justify-center gap-6 p-6', className)}>
      <BrandMark size="lg" />
      <FadeIn delay={400} className="items-center gap-3">
        <ActivityIndicator className="text-accent" />
        <Text variant="muted" role="status" aria-live="polite">
          {message ?? t('common.loading')}
        </Text>
      </FadeIn>
    </View>
  );
}

/** Full-screen error with a retry, plus an optional secondary way out. */
export function AppError({
  message,
  onRetry,
  secondary,
}: {
  message: string;
  onRetry: () => void;
  secondary?: { label: string; onPress: () => void };
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-6 p-6">
      <BrandMark size="lg" />
      <FadeIn className="w-full max-w-sm items-center gap-5">
        <Text className="text-center text-base leading-6" role="alert">
          {message}
        </Text>
        <View className="w-full gap-2">
          <Button size="lg" onPress={onRetry}>
            <Text>{t('common.retry')}</Text>
          </Button>
          {secondary ? (
            <Button variant="ghost" size="lg" onPress={secondary.onPress}>
              <Text>{secondary.label}</Text>
            </Button>
          ) : null}
        </View>
      </FadeIn>
    </View>
  );
}
