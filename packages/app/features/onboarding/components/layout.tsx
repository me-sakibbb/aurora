'use client';

import { useTranslation } from '@aurora/i18n';
import { ChevronLeft, cn, Icon, Text } from '@aurora/ui';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { BrandMark } from '../../../components/brand-mark';
import { LanguageToggle } from '../../../components/language-toggle';
import { useInsets } from '../../../lib/insets';
import { AuroraGlow } from './visuals';

/**
 * Shell for every onboarding step.
 * - Phones: back + progress on top, the step scrolling in the middle, its actions pinned at the
 *   bottom (thumb reach).
 * - Wide web (lg+): the step sits in a centred card with its actions inline underneath, so they
 *   aren't stranded at the bottom of a tall window. `wide` drops the card (landing page).
 */
export function OnboardingLayout({
  progress,
  eyebrow,
  onBack,
  headerAction,
  footer,
  wide = false,
  children,
}: {
  /** 0–1; hidden when undefined (e.g. Welcome). */
  progress?: number;
  /** Small section label above the step (e.g. "Your kitchen"). */
  eyebrow?: string;
  onBack?: () => void;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useInsets();

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <AuroraGlow />
      {/* No padding on the KeyboardAvoidingView itself: with behavior="padding" it sets its own
          paddingBottom (0 while the keyboard is closed), which would drop the safe-area inset
          and push the pinned actions under Android's navigation bar. */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
      >
        <View
          className={cn(
            'w-full flex-row items-center gap-3 self-center px-4 pt-3 sm:px-6 sm:pt-5',
            wide ? 'max-w-6xl' : 'max-w-[560px]',
          )}
        >
          <View className="min-w-10">
            {onBack ? (
              <Pressable
                onPress={onBack}
                role="button"
                aria-label={t('onboarding.back')}
                hitSlop={8}
                className="bg-card border-border h-10 w-10 items-center justify-center rounded-full border active:opacity-60"
              >
                <Icon as={ChevronLeft} size={20} />
              </Pressable>
            ) : wide ? (
              <View className="flex-row items-center gap-2.5">
                <BrandMark />
                <Text className="text-lg font-semibold tracking-tight">{t('common.appName')}</Text>
              </View>
            ) : null}
          </View>
          <View className="flex-1">
            {progress !== undefined ? <ProgressBar value={progress} /> : null}
          </View>
          <View className="min-w-10 items-end">{headerAction ?? <LanguageToggle />}</View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="grow"
          // Without a pinned footer the content itself must clear the bottom inset.
          contentContainerStyle={{ paddingBottom: footer ? 0 : insets.bottom }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View
            className={cn(
              'w-full grow self-center px-5 pb-8 pt-6 sm:px-8',
              wide ? 'max-w-6xl' : 'max-w-[560px] lg:grow-0 lg:py-12',
            )}
          >
            <View
              className={cn(
                'grow gap-7',
                !wide &&
                  'lg:bg-card lg:border-border lg:grow-0 lg:rounded-3xl lg:border lg:p-10 lg:shadow-xl lg:shadow-black/5',
              )}
            >
              {eyebrow ? (
                <Text className="text-muted-foreground -mb-4 text-xs font-semibold uppercase tracking-widest">
                  {eyebrow}
                </Text>
              ) : null}
              {children}
              {footer && !wide ? <View className="hidden gap-2 pt-1 lg:flex">{footer}</View> : null}
            </View>
          </View>
        </ScrollView>

        {footer ? (
          <View
            className="bg-background/95 border-border/70 w-full border-t lg:hidden"
            style={{ paddingBottom: insets.bottom }}
          >
            <View
              className={cn(
                'w-full gap-2 self-center px-5 pb-4 pt-3 sm:px-8',
                wide ? 'max-w-6xl' : 'max-w-[560px]',
              )}
            >
              {footer}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const { t } = useTranslation();
  const clamped = Math.min(1, Math.max(0, value));
  // Starts from the previous step's value so each step visibly fills a bit more.
  const width = useRef(new Animated.Value(previousProgress)).current;

  useEffect(() => {
    const animation = Animated.timing(width, {
      toValue: clamped,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    previousProgress = clamped;
    return () => animation.stop();
  }, [width, clamped]);

  return (
    <View
      role="progressbar"
      aria-label={t('onboarding.progressLabel')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="bg-muted h-2 overflow-hidden rounded-full"
    >
      <Animated.View
        className="bg-primary h-full rounded-full"
        style={{ width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}
      />
    </View>
  );
}

// The layout remounts per step; this carries the bar's position across so it animates forward.
let previousProgress = 0;

/** Question title + optional supporting line at the top of a step. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-2">
      <Text
        role="heading"
        aria-level={1}
        className="text-[26px] font-semibold leading-8 tracking-tight"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-muted-foreground text-base leading-6">{subtitle}</Text>
      ) : null}
    </View>
  );
}
