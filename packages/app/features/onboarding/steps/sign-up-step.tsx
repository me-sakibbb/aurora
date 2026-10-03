'use client';

import {
  type AuthErrorKind,
  effectiveModules,
  signInWithGoogle,
  signOutOfGoogle,
  toAuthErrorKind,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, Check, Icon, ShieldCheck, Text } from '@aurora/ui';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useAppRouter } from '../../../lib/navigation';
import { useIsOnline } from '../../../lib/use-online';
import { FormMessage, GoogleButton } from '../../auth/components/form';
import { NotApprovedPanel } from '../../auth/components/panels';
import { StepHeading } from '../components/layout';
import { HeroIcon } from '../components/visuals';
import type { StepDefinition } from './types';

/**
 * The sign-up gate (not a question). Answers so far stay saved on the device; once an account
 * exists the auth gate brings the person back to /onboarding and the flow resumes after this step.
 */
export const signUpStep: StepDefinition = {
  hideFooter: true,
  Body: function SignUpBody({ draft }) {
    const { t } = useTranslation();
    const router = useAppRouter();
    const online = useIsOnline();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<AuthErrorKind | null>(null);

    async function continueWithGoogle() {
      setError(null);
      setBusy(true);
      try {
        await signInWithGoogle();
        // Web navigates away to Google, so stay busy until the page unloads.
        if (Platform.OS !== 'web') setBusy(false);
      } catch (e) {
        setError(toAuthErrorKind(e));
        setBusy(false);
      }
    }

    if (error === 'notApproved') {
      return (
        <NotApprovedPanel
          onTryAgain={() => {
            void signOutOfGoogle();
            setError(null);
          }}
        />
      );
    }

    return (
      <>
        <HeroIcon icon={ShieldCheck} />
        <StepHeading
          title={t('onboarding.signUp.title')}
          subtitle={t('onboarding.signUp.subtitle')}
        />
        <View className="bg-card border-border gap-3 rounded-2xl border p-4">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
            {t('onboarding.signUp.summary')}
          </Text>
          {[
            draft.goal && t(`onboarding.options.goal.${draft.goal}`),
            ...effectiveModules(draft).map((m) =>
              m === 'food' ? t('onboarding.features.food') : t('onboarding.features.cycle'),
            ),
          ]
            .filter((item): item is string => Boolean(item))
            .map((item) => (
              <View key={item} className="flex-row items-center gap-3">
                <View className="bg-primary h-5 w-5 items-center justify-center rounded-full">
                  <Icon as={Check} size={12} strokeWidth={3} className="text-primary-foreground" />
                </View>
                <Text className="flex-1 text-sm font-medium">{item}</Text>
              </View>
            ))}
        </View>
        {!online ? <FormMessage tone="offline">{t('auth.offline')}</FormMessage> : null}
        {error ? <FormMessage tone="error">{t(`auth.errors.${error}`)}</FormMessage> : null}
        <View className="gap-3">
          <GoogleButton busy={busy} disabled={!online} onPress={continueWithGoogle} />
          <Button
            variant="outline"
            size="lg"
            className="bg-card"
            disabled={busy || !online}
            onPress={() => router.push('/login?mode=signup')}
          >
            <Text>{t('onboarding.signUp.email')}</Text>
          </Button>
        </View>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          {t('auth.beta.note')}
        </Text>
      </>
    );
  },
};
