'use client';

import { useTranslation } from '@mybela/i18n';
import { Check, cn, Icon, type IconComponent, Mail, Text } from '@mybela/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, View } from 'react-native';
import { useReducedMotion } from '../../../lib/use-reduced-motion';

// Same registration as fade-in.tsx (repeating it is harmless), so Animated.View takes `className`.
cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/** A 0 → 1 → 0 value that loops forever (stays at `rest` when reduce motion is on). */
function useBreath(duration: number, delay = 0, rest = 0) {
  const value = useRef(new Animated.Value(rest)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      value.setValue(rest);
      return;
    }
    const half = {
      duration: duration / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver,
    };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { ...half, toValue: 1 }),
        Animated.timing(value, { ...half, toValue: 0 }),
      ]),
    );
    value.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [reduced, value, duration, delay, rest]);

  return value;
}

// ─── Email pill ─────────────────────────────────────────────────────────────────────────────────

/** The account in question, set apart from the prose so it's easy to check at a glance. */
export function EmailPill({ email }: { email: string }) {
  return (
    <View className="bg-muted max-w-full flex-row items-center gap-2 self-center rounded-full py-1.5 pl-1.5 pr-4">
      <View className="bg-card h-7 w-7 items-center justify-center rounded-full">
        <Icon as={Mail} size={14} className="text-muted-foreground" />
      </View>
      <Text numberOfLines={1} className="text-foreground shrink text-sm font-medium">
        {email}
      </Text>
    </View>
  );
}

// ─── Status timeline ────────────────────────────────────────────────────────────────────────────

export type WaitlistStep = {
  title: string;
  hint: string;
  state: 'done' | 'current' | 'upcoming';
  icon?: IconComponent;
};

/** A soft ripple behind the current step's dot, so "in review" feels alive rather than stuck. */
function Ripple() {
  const pulse = useBreath(2400);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <Animated.View
      className="bg-sage/40 absolute h-8 w-8 rounded-full"
      style={{ opacity, transform: [{ scale }] }}
    />
  );
}

function StepDot({ step, busy }: { step: WaitlistStep; busy: boolean }) {
  if (step.state === 'done') {
    return (
      <View className="bg-primary h-8 w-8 items-center justify-center rounded-full">
        <Icon as={Check} size={16} strokeWidth={2.5} className="text-primary-foreground" />
      </View>
    );
  }
  if (step.state === 'current') {
    return (
      <View className="h-8 w-8 items-center justify-center">
        <Ripple />
        <View className="bg-card border-sage h-8 w-8 items-center justify-center rounded-full border-2">
          {busy ? (
            <ActivityIndicator size="small" className="text-muted-foreground" />
          ) : step.icon ? (
            <Icon as={step.icon} size={15} className="text-muted-foreground" />
          ) : (
            <View className="bg-sage h-2.5 w-2.5 rounded-full" />
          )}
        </View>
      </View>
    );
  }
  return (
    <View className="bg-card border-border h-8 w-8 items-center justify-center rounded-full border-2">
      {step.icon ? <Icon as={step.icon} size={15} className="text-muted-foreground/60" /> : null}
    </View>
  );
}

/**
 * Where this person stands, as a short vertical timeline. Purely a picture of the access status the
 * backend returned (`pending`); it doesn't decide anything.
 */
export function WaitlistTimeline({
  steps,
  busy = false,
}: {
  steps: WaitlistStep[];
  /** Spinner on the current step while a fresh status is being fetched. */
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-card border-border rounded-2xl border px-4 pb-1 pt-4">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View key={step.title} className="flex-row gap-3">
            <View className="items-center">
              <StepDot step={step} busy={busy} />
              {last ? null : (
                <View
                  className={cn(
                    'my-1 w-0.5 flex-1 rounded-full',
                    step.state === 'done' ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </View>
            <View className="flex-1 gap-0.5 pb-4 pt-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  className={cn(
                    'text-base font-semibold',
                    step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {step.title}
                </Text>
                {step.state === 'current' ? (
                  <View className="bg-secondary/40 rounded-full px-2 py-0.5">
                    <Text className="text-secondary-foreground text-xs font-medium">
                      {t('auth.waitlist.inProgress')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-muted-foreground text-sm leading-5">{step.hint}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Tips + feature teaser (not-approved panel) ─────────────────────────────────────────────────

/** An icon tile + a short title and line, for the "how do I get in" tips. */
export function WaitlistTip({
  icon,
  title,
  hint,
}: {
  icon: IconComponent;
  title: string;
  hint: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="bg-secondary/40 h-10 w-10 items-center justify-center rounded-xl">
        <Icon as={icon} size={18} className="text-secondary-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-base font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-sm leading-5">{hint}</Text>
      </View>
    </View>
  );
}

/** Three small tiles previewing what MyBela does, so the wait has something to look forward to. */
export function FeatureTeaser({
  title,
  items,
}: {
  title: string;
  items: { icon: IconComponent; label: string; tone: string }[];
}) {
  return (
    <View className="gap-3">
      <Text className="text-muted-foreground text-center text-xs font-semibold uppercase tracking-widest">
        {title}
      </Text>
      <View className="flex-row gap-2">
        {items.map((item) => (
          <View
            key={item.label}
            className="bg-card border-border flex-1 items-center gap-2 rounded-2xl border px-2 py-3"
          >
            <View className={cn('h-10 w-10 items-center justify-center rounded-full', item.tone)}>
              <Icon as={item.icon} size={18} className="text-olive" />
            </View>
            <Text className="text-foreground text-center text-xs leading-4">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
