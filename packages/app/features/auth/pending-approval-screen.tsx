'use client';

import { useTranslation } from '@mybela/i18n';
import { Button, Clock, PartyPopper, Text } from '@mybela/ui';
import { useState } from 'react';
import { View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useIsOnline } from '../../lib/use-online';
import { AuthLayout } from './components/auth-layout';
import { FormMessage } from './components/form';
import { EmailPill, WaitlistTimeline } from './components/waitlist';
import { useAccessStatus, useAuthStore, useSignOut } from './session';

/**
 * TEMPORARY beta guard: shown instead of the app to signed-in people whose allowlist row is still
 * `pending`. Their account and onboarding answers are already saved; once an admin approves them,
 * "Check again" (or the next launch) lets them in.
 */
export function PendingApprovalScreen() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const session = useAuthStore((s) => s.session);
  const access = useAccessStatus(session?.user.id, session?.user.email);
  const signOut = useSignOut();
  const [stillPending, setStillPending] = useState(false);
  const email = session?.user.email;

  async function checkAgain() {
    setStillPending(false);
    const result = await access.refetch();
    if (result.data === 'pending') setStillPending(true);
  }

  return (
    <AuthLayout>
      <View className="gap-6">
        <FadeIn delay={80} className="gap-3">
          <Text
            role="heading"
            aria-level={1}
            className="text-center text-2xl font-semibold tracking-tight"
          >
            {t('auth.pending.title')}
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            {t('auth.pending.lead')}
          </Text>
          {email ? <EmailPill email={email} /> : null}
        </FadeIn>
        <FadeIn delay={160}>
          <WaitlistTimeline
            busy={access.isFetching}
            steps={[
              {
                state: 'done',
                title: t('auth.pending.stepAccount'),
                hint: t('auth.pending.stepAccountHint'),
              },
              {
                state: 'done',
                title: t('auth.pending.stepAnswers'),
                hint: t('auth.pending.stepAnswersHint'),
              },
              {
                state: 'current',
                icon: Clock,
                title: t('auth.pending.stepReview'),
                hint: t('auth.pending.stepReviewHint'),
              },
              {
                state: 'upcoming',
                icon: PartyPopper,
                title: t('auth.pending.stepWelcome'),
                hint: t('auth.pending.stepWelcomeHint'),
              },
            ]}
          />
        </FadeIn>
        {!online ? <FormMessage tone="offline">{t('auth.offline')}</FormMessage> : null}
        {stillPending ? (
          <FadeIn key="still-pending">
            <FormMessage tone="info">{t('auth.pending.stillPending')}</FormMessage>
          </FadeIn>
        ) : null}
        <FadeIn delay={240} className="gap-2">
          <Button size="lg" onPress={checkAgain} disabled={access.isFetching || !online}>
            <Text>{access.isFetching ? t('common.loading') : t('auth.pending.checkAgain')}</Text>
          </Button>
          <Button variant="ghost" size="lg" onPress={() => signOut.mutate()}>
            <Text>{t('auth.signOut')}</Text>
          </Button>
        </FadeIn>
      </View>
    </AuthLayout>
  );
}
