'use client';

import {
  type AuthErrorKind,
  type EmailPasswordInput,
  emailPasswordSchema,
  MIN_PASSWORD_LENGTH,
  resendSignUpEmail,
  signInWithGoogle,
  signInWithPassword,
  signOutOfGoogle,
  signUpSchema,
  signUpWithPassword,
  toAuthErrorKind,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Input, Text } from '@aurora/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { Platform, type TextInput, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useAppRouter, useSearchParam } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { AuthHeading, AuthLayout } from './components/auth-layout';
import {
  Divider,
  FormField,
  FormMessage,
  fieldError,
  GoogleButton,
  PasswordInput,
  SubmitButton,
  TextLink,
} from './components/form';
import { ModeSwitch } from './components/mode-switch';
import { CheckEmailPanel, NotApprovedPanel } from './components/panels';

type Mode = 'signIn' | 'signUp';
type Step =
  | { kind: 'form' }
  | { kind: 'notApproved'; email?: string }
  | { kind: 'checkEmail'; email: string; canResendNow: boolean };

/**
 * F1 entry point. Sign in and create account share one screen (a tab switch), with Google on top.
 * After success there's no navigation here: the auth gate sees the new session and routes the
 * person to onboarding (new) or home (returning).
 *
 * URL params: `mode=signup`, `error=not_approved | link_expired` (from the auth callback),
 * `next` (read by the gate).
 */
export function LoginScreen() {
  return (
    <AuthLayout>
      <LoginContent />
    </AuthLayout>
  );
}

function LoginContent() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const online = useIsOnline();
  const errorParam = useSearchParam('error');

  const [mode, setMode] = useState<Mode>(useSearchParam('mode') === 'signup' ? 'signUp' : 'signIn');
  const [step, setStep] = useState<Step>(
    errorParam === 'not_approved' ? { kind: 'notApproved' } : { kind: 'form' },
  );
  const [formError, setFormError] = useState<AuthErrorKind | null>(
    errorParam === 'link_expired' ? 'linkExpired' : null,
  );
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const passwordRef = useRef<TextInput>(null);

  // Sign-up has stricter password rules than sign-in; pick the schema at validation time.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const resolver: Resolver<EmailPasswordInput> = (values, context, options) =>
    zodResolver(modeRef.current === 'signUp' ? signUpSchema : emailPasswordSchema)(
      values,
      context,
      options,
    );

  const form = useForm<EmailPasswordInput>({
    resolver,
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  function handleError(error: unknown, email?: string) {
    const kind = toAuthErrorKind(error);
    if (kind === 'notApproved') {
      setStep({ kind: 'notApproved', email });
    } else if (kind === 'emailNotConfirmed' && email) {
      setStep({ kind: 'checkEmail', email, canResendNow: true });
    } else if (kind === 'accountExists') {
      setMode('signIn');
      setFormError(kind);
    } else {
      setFormError(kind);
    }
  }

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    setBusy('email');
    try {
      if (mode === 'signIn') {
        await signInWithPassword(values);
      } else if ((await signUpWithPassword(values)) === 'confirmEmail') {
        setStep({ kind: 'checkEmail', email: values.email, canResendNow: false });
      }
    } catch (error) {
      handleError(error, values.email);
    } finally {
      setBusy(null);
    }
  });

  async function continueWithGoogle() {
    setFormError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      // Web navigates away to Google, so stay busy until the page unloads.
      if (Platform.OS !== 'web') setBusy(null);
    } catch (error) {
      handleError(error);
      setBusy(null);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    form.clearErrors();
  }

  function backToForm() {
    void signOutOfGoogle();
    form.reset({ email: '', password: '' });
    setFormError(null);
    setStep({ kind: 'form' });
    // Drop ?error= so a refresh doesn't bring the message back.
    if (errorParam) router.replace('/login');
  }

  function goToForgotPassword() {
    const email = form.getValues('email').trim();
    router.push(email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password');
  }

  if (step.kind === 'notApproved') {
    return <NotApprovedPanel email={step.email} onTryAgain={backToForm} />;
  }
  if (step.kind === 'checkEmail') {
    return (
      <CheckEmailPanel
        email={step.email}
        variant="confirm"
        initialCooldown={step.canResendNow ? 0 : undefined}
        onResend={() => resendSignUpEmail(step.email)}
        onBack={() => {
          switchMode('signIn');
          setStep({ kind: 'form' });
        }}
      />
    );
  }

  const isSignUp = mode === 'signUp';
  const disabled = busy !== null || !online;

  return (
    <FadeIn className="gap-6">
      {/* Keyed so the heading fades in again on each mode switch. */}
      <FadeIn key={mode}>
        <AuthHeading
          title={isSignUp ? t('auth.signUp.title') : t('auth.signIn.title')}
          subtitle={isSignUp ? t('auth.signUp.subtitle') : t('auth.signIn.subtitle')}
        />
      </FadeIn>

      <ModeSwitch
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'signIn', label: t('auth.tabs.signIn') },
          { value: 'signUp', label: t('auth.tabs.signUp') },
        ]}
      />

      {!online ? <FormMessage tone="offline">{t('auth.offline')}</FormMessage> : null}
      {formError ? (
        <FormMessage
          tone={formError === 'accountExists' ? 'info' : 'error'}
          action={
            formError === 'invalidCredentials'
              ? { label: t('auth.resetPasswordAction'), onPress: goToForgotPassword }
              : undefined
          }
        >
          {t(`auth.errors.${formError}`)}
        </FormMessage>
      ) : null}

      <GoogleButton busy={busy === 'google'} disabled={disabled} onPress={continueWithGoogle} />
      <Divider label={t('auth.divider')} />

      <View className="gap-4">
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
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={busy === null}
              />
            </FormField>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormField
              label={isSignUp ? t('auth.fields.newPassword') : t('auth.fields.password')}
              error={fieldError(t, fieldState.error?.message)}
              hint={
                isSignUp ? t('auth.fields.passwordHint', { count: MIN_PASSWORD_LENGTH }) : undefined
              }
              labelAction={
                isSignUp ? undefined : (
                  <TextLink label={t('auth.forgotPassword')} onPress={goToForgotPassword} />
                )
              }
            >
              <PasswordInput
                ref={passwordRef}
                aria-label={isSignUp ? t('auth.fields.newPassword') : t('auth.fields.password')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(fieldState.error)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                textContentType={isSignUp ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                editable={busy === null}
              />
            </FormField>
          )}
        />
      </View>

      <SubmitButton
        label={isSignUp ? t('auth.signUp.submit') : t('auth.signIn.submit')}
        busyLabel={isSignUp ? t('auth.signUp.submitting') : t('auth.signIn.submitting')}
        busy={busy === 'email'}
        disabled={disabled}
        onPress={() => void submit()}
      />

      <Text className="text-muted-foreground text-center text-sm leading-5 lg:hidden">
        {t('auth.beta.note')}
      </Text>
    </FadeIn>
  );
}
