'use client';

import {
  type AuthErrorKind,
  MIN_PASSWORD_LENGTH,
  type NewPasswordInput,
  newPasswordSchema,
  toAuthErrorKind,
  updatePassword,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, Text } from '@aurora/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, type TextInput, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useAppRouter } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { AuthHeading, AuthLayout } from './components/auth-layout';
import { FormField, FormMessage, fieldError, PasswordInput, SubmitButton } from './components/form';
import { useAuthStore } from './session';

/**
 * Reached from the password reset email (via /auth/callback, which signs the person in with the
 * recovery link first). Without that session the link was expired or already used.
 */
export function ResetPasswordScreen() {
  const status = useAuthStore((s) => s.status);
  return (
    <AuthLayout>
      {status === 'loading' ? (
        <ActivityIndicator className="text-accent" />
      ) : status === 'signedIn' ? (
        <ResetPasswordForm />
      ) : (
        <LinkExpired />
      )}
    </AuthLayout>
  );
}

function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const online = useIsOnline();
  const [formError, setFormError] = useState<AuthErrorKind | null>(null);
  const confirmRef = useRef<TextInput>(null);

  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
    mode: 'onTouched',
  });

  const submit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await updatePassword(password);
      // Home; the gate forwards to onboarding if this account hasn't finished it.
      router.replace('/');
    } catch (error) {
      setFormError(toAuthErrorKind(error));
    }
  });

  const busy = form.formState.isSubmitting;

  return (
    <FadeIn className="gap-6">
      <AuthHeading title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />

      {!online ? <FormMessage tone="offline">{t('auth.offline')}</FormMessage> : null}
      {formError ? <FormMessage tone="error">{t(`auth.errors.${formError}`)}</FormMessage> : null}

      <View className="gap-4">
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormField
              label={t('auth.fields.newPassword')}
              error={fieldError(t, fieldState.error?.message)}
              hint={t('auth.fields.passwordHint', { count: MIN_PASSWORD_LENGTH })}
            >
              <PasswordInput
                aria-label={t('auth.fields.newPassword')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!busy}
              />
            </FormField>
          )}
        />
        <Controller
          control={form.control}
          name="confirm"
          render={({ field, fieldState }) => (
            <FormField
              label={t('auth.fields.confirmPassword')}
              error={fieldError(t, fieldState.error?.message)}
            >
              <PasswordInput
                ref={confirmRef}
                aria-label={t('auth.fields.confirmPassword')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                editable={!busy}
              />
            </FormField>
          )}
        />
      </View>

      <SubmitButton
        label={t('auth.reset.submit')}
        busyLabel={t('auth.reset.submitting')}
        busy={busy}
        disabled={!online}
        onPress={() => void submit()}
      />
    </FadeIn>
  );
}

function LinkExpired() {
  const { t } = useTranslation();
  const router = useAppRouter();
  return (
    <FadeIn className="gap-6">
      <AuthHeading title={t('auth.reset.expiredTitle')} subtitle={t('auth.reset.expiredBody')} />
      <View className="gap-2">
        <Button size="lg" onPress={() => router.replace('/forgot-password')}>
          <Text>{t('auth.reset.requestNew')}</Text>
        </Button>
        <Button variant="ghost" size="lg" onPress={() => router.replace('/login')}>
          <Text>{t('auth.checkEmail.back')}</Text>
        </Button>
      </View>
    </FadeIn>
  );
}
