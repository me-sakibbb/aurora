'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, cn, GoogleIcon, Input, type InputProps, Label, Text } from '@aurora/ui';
import { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, type TextInput, View } from 'react-native';

type TFunction = ReturnType<typeof useTranslation>['t'];

/** Zod messages are i18n keys (see packages/api/src/schemas); this translates one for display. */
export function fieldError(t: TFunction, message: string | undefined) {
  return message ? t(message as Parameters<TFunction>[0]) : undefined;
}

/** Label, control, and either an error or a hint underneath. */
export function FormField({
  label,
  labelAction,
  error,
  hint,
  children,
}: {
  label: string;
  labelAction?: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="min-h-5 flex-row items-end justify-between">
        <Label>{label}</Label>
        {labelAction}
      </View>
      {children}
      {error ? (
        <Text className="text-destructive text-sm" role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-muted-foreground text-sm">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Password input with a text Show/Hide toggle (clearer than an eye icon, and translatable). */
export const PasswordInput = forwardRef<TextInput, InputProps>(function PasswordInput(props, ref) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <View className="relative justify-center">
      <Input
        ref={ref}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        className="pr-20"
        {...props}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        role="button"
        aria-label={visible ? t('auth.hidePasswordLabel') : t('auth.showPasswordLabel')}
        hitSlop={8}
        className="absolute right-1 h-10 min-w-16 items-center justify-center rounded-md px-3 active:opacity-60"
      >
        <Text className="text-muted-foreground text-sm font-medium">
          {visible ? t('auth.hidePassword') : t('auth.showPassword')}
        </Text>
      </Pressable>
    </View>
  );
});

/** Primary action with an inline spinner. Keeps its width while busy so nothing jumps. */
export function SubmitButton({
  label,
  busyLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      size="lg"
      onPress={onPress}
      disabled={busy || disabled}
      aria-busy={busy}
      className={cn(busy && 'opacity-90')}
    >
      {busy ? <ActivityIndicator size="small" className="text-primary-foreground" /> : null}
      <Text>{busy ? busyLabel : label}</Text>
    </Button>
  );
}

export function GoogleButton({
  busy,
  disabled,
  onPress,
}: {
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      variant="outline"
      size="lg"
      onPress={onPress}
      disabled={busy || disabled}
      aria-busy={busy}
      className="bg-card"
    >
      {busy ? <ActivityIndicator size="small" className="text-foreground" /> : <GoogleIcon />}
      <Text>{busy ? t('auth.googleBusy') : t('auth.google')}</Text>
    </Button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3" aria-hidden>
      <View className="bg-border h-px flex-1" />
      <Text className="text-muted-foreground text-xs uppercase tracking-wider">{label}</Text>
      <View className="bg-border h-px flex-1" />
    </View>
  );
}

/**
 * Inline message above a form. `error` for failures, `info` for neutral guidance, `offline` for
 * connectivity. Announced to screen readers when it appears.
 */
export function FormMessage({
  tone,
  children,
  action,
}: {
  tone: 'error' | 'info' | 'offline';
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      role="alert"
      aria-live="polite"
      className={cn(
        'gap-2 rounded-lg border-l-4 px-4 py-3',
        tone === 'error' && 'border-destructive bg-destructive/10',
        tone === 'info' && 'border-sage bg-muted',
        tone === 'offline' && 'border-taupe bg-secondary/30',
      )}
    >
      <Text className="text-foreground text-sm leading-5">{children}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          role="button"
          hitSlop={8}
          className="self-start active:opacity-60"
        >
          <Text className="text-foreground text-sm font-semibold underline">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small text link (e.g. "Forgot password?"), with a comfortable touch area. */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} role="link" hitSlop={10} className="active:opacity-60">
      <Text className="text-muted-foreground text-sm font-medium underline-offset-4 hover:underline">
        {label}
      </Text>
    </Pressable>
  );
}
