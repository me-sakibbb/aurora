'use client';

import {
  type AuthErrorKind,
  type EmailOnlyInput,
  emailOnlySchema,
  sendPasswordResetEmail,
  toAuthErrorKind,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, Input, Text } from '@aurora/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useAppRouter, useSearchParam } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { AuthHeading, AuthLayout } from './components/auth-layout';
import { FormField, FormMessage, fieldError, SubmitButton } from './components/form';
import { CheckEmailPanel } from './components/panels';

/** Request a password reset link. The same confirmation shows whether or not the email has an account. */
export function ForgotPasswordScreen() {
  return (
    <AuthLayout>
      <ForgotPasswordContent />
    </AuthLayout>
  );
}

function ForgotPasswordContent() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const online = useIsOnline();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<AuthErrorKind | null>(null);

  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: useSearchParam('email') ?? '' },
    mode: 'onTouched',
  });

  const submit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await sendPasswordResetEmail(email);
      setSentTo(email);
    } catch (error) {
      setFormError(toAuthErrorKind(error));
    }
  });

  if (sentTo) {
    return (
      <CheckEmailPanel
        email={sentTo}
        variant="reset"
        onResend={() => sendPasswordResetEmail(sentTo)}
        onBack={() => router.replace('/login')}
      />
    );
  }

  return (
    <FadeIn className="gap-6">
      <AuthHeading title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />

      {!online ? <FormMessage tone="offline">{t('auth.offline')}</FormMessage> : null}
      {formError ? <FormMessage tone="error">{t(`auth.errors.${formError}`)}</FormMessage> : null}

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <FormField
            label={t('auth.fields.email')}
            error={fieldError(t, fieldState.error?.message)}
          >
            <Input
              aria-label={t('auth.fields.email')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              invalid={Boolean(fieldState.error)}
              placeholder={t('auth.fields.emailPlaceholder')}
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
              editable={!form.formState.isSubmitting}
            />
          </FormField>
        )}
      />

      <View>
        <SubmitButton
          label={t('auth.forgot.submit')}
          busyLabel={t('auth.forgot.submitting')}
          busy={form.formState.isSubmitting}
          disabled={!online}
          onPress={() => void submit()}
        />
        <Button variant="ghost" size="lg" className="mt-2" onPress={() => router.replace('/login')}>
          <Text>{t('auth.checkEmail.back')}</Text>
        </Button>
      </View>
    </FadeIn>
  );
}
