'use client';

import { toAuthErrorKind } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, CalendarHeart, RefreshCw, Salad, Smile, Text, UserRoundCheck } from '@mybela/ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { FormMessage } from './form';
import { EmailPill, FeatureTeaser, WaitlistTip } from './waitlist';

function EnvelopeIllustration() {
  return (
    <View
      aria-hidden
      className="bg-muted h-20 w-20 items-center justify-center self-center rounded-full"
    >
      <View className="border-accent bg-card h-8 w-11 items-center overflow-hidden rounded-md border-2">
        <View className="border-accent -mt-4 h-6 w-6 rotate-45 border-2" />
      </View>
    </View>
  );
}

/**
 * Shown when the backend says this person isn't on the allowlist. Deliberately calm, not an error
 * banner: nothing is "wrong" with what they typed, they just aren't invited (yet).
 */
export function NotApprovedPanel({
  email,
  onTryAgain,
}: {
  email?: string;
  onTryAgain: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-6">
      <FadeIn delay={80} className="gap-3">
        <Text
          role="heading"
          aria-level={1}
          className="text-center text-2xl font-semibold tracking-tight"
        >
          {t('auth.notApproved.title')}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {t('auth.notApproved.lead')}
        </Text>
        {email ? <EmailPill email={email} /> : null}
      </FadeIn>
      <FadeIn delay={160} className="bg-card border-border gap-4 rounded-2xl border p-4">
        <WaitlistTip
          icon={RefreshCw}
          title={t('auth.notApproved.tipLaterTitle')}
          hint={t('auth.notApproved.tipLaterHint')}
        />
        <View className="bg-border h-px" />
        <WaitlistTip
          icon={UserRoundCheck}
          title={t('auth.notApproved.tipInvitedTitle')}
          hint={t('auth.notApproved.tipInvitedHint')}
        />
      </FadeIn>
      <FadeIn delay={240}>
        <FeatureTeaser
          title={t('auth.notApproved.teaser')}
          items={[
            { icon: Salad, label: t('auth.brand.featureFood'), tone: 'bg-mood-4' },
            { icon: CalendarHeart, label: t('auth.brand.featureCycle'), tone: 'bg-mood-2' },
            { icon: Smile, label: t('auth.brand.featureMood'), tone: 'bg-mood-5' },
          ]}
        />
      </FadeIn>
      <FadeIn delay={320}>
        <Button size="lg" onPress={onTryAgain}>
          <Text>{t('auth.notApproved.tryAgain')}</Text>
        </Button>
      </FadeIn>
    </View>
  );
}

const RESEND_COOLDOWN_SECONDS = 60;

/** "We emailed you" state for sign-up confirmation and password reset, with a throttled resend. */
export function CheckEmailPanel({
  email,
  variant,
  initialCooldown = RESEND_COOLDOWN_SECONDS,
  onResend,
  onBack,
}: {
  email: string;
  variant: 'confirm' | 'reset';
  /** Seconds before resend is allowed. 0 when the user arrives needing a fresh email. */
  initialCooldown?: number;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    setStatus(null);
    try {
      await onResend();
      setStatus({ tone: 'info', text: t('auth.checkEmail.resent') });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setStatus({ tone: 'error', text: t(`auth.errors.${toAuthErrorKind(error)}`) });
    } finally {
      setSending(false);
    }
  }

  return (
    <FadeIn className="gap-6">
      <EnvelopeIllustration />
      <View className="gap-3">
        <Text
          role="heading"
          aria-level={1}
          className="text-center text-2xl font-semibold tracking-tight"
        >
          {t('auth.checkEmail.title')}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {variant === 'confirm'
            ? t('auth.checkEmail.confirmBody', { email })
            : t('auth.checkEmail.resetBody', { email })}
        </Text>
        <Text className="text-muted-foreground text-center text-sm">
          {t('auth.checkEmail.spamHint')}
        </Text>
      </View>
      {status ? <FormMessage tone={status.tone}>{status.text}</FormMessage> : null}
      <View className="gap-2">
        <Button
          variant="outline"
          size="lg"
          className="bg-card"
          onPress={resend}
          disabled={sending || cooldown > 0}
        >
          <Text>
            {cooldown > 0
              ? t('auth.checkEmail.resendIn', { seconds: cooldown })
              : t('auth.checkEmail.resend')}
          </Text>
        </Button>
        <Button variant="ghost" size="lg" onPress={onBack}>
          <Text>{t('auth.checkEmail.back')}</Text>
        </Button>
      </View>
    </FadeIn>
  );
}
