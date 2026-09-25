'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Text } from '@aurora/ui';
import { View } from 'react-native';
import { BrandMark } from '../../components/brand-mark';
import { useSignOut } from '../auth/session';

// PLACEHOLDER for F2 (four-step onboarding). It exists so F1 can route new users here.
// When F2 finishes, invalidate `onboardingQueryKey(userId)` so the auth gate sends the user home.
export function OnboardingScreen() {
  const { t } = useTranslation();
  const signOut = useSignOut();

  return (
    <View className="bg-background flex-1 items-center justify-center gap-6 p-6">
      <BrandMark size="lg" />
      <View className="max-w-sm gap-2">
        <Text role="heading" aria-level={1} className="text-center text-2xl font-semibold">
          {t('onboarding.placeholder.title')}
        </Text>
        <Text variant="muted" className="text-center text-base">
          {t('onboarding.placeholder.body')}
        </Text>
      </View>
      <Button variant="outline" onPress={() => signOut.mutate()} disabled={signOut.isPending}>
        <Text>{t('auth.signOut')}</Text>
      </Button>
    </View>
  );
}
