'use client';

import { useTranslation } from '@mybela/i18n';
import { Text } from '@mybela/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { useReducedMotion } from '../../../lib/use-reduced-motion';
import { AssistantAvatar } from './avatar';

cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/** After this long, a reassuring line joins the dots (F16: a reply taking longer than usual). */
const SLOW_AFTER_MS = 8_000;
const VERY_SLOW_AFTER_MS = 25_000;

function Dot({ delay, reduced }: { delay: number; reduced: boolean }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
        Animated.delay(480 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, delay, reduced]);

  return (
    <Animated.View
      className="bg-muted-foreground h-2 w-2 rounded-full"
      style={
        reduced
          ? { opacity: 0.6 }
          : {
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [
                { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
              ],
            }
      }
    />
  );
}

/** MyBela is writing: three soft dots, then honest reassurance if it's taking a while. */
export function TypingIndicator({ since }: { since: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState(() => Date.now() - Date.parse(since));

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - Date.parse(since)), 1000);
    return () => clearInterval(timer);
  }, [since]);

  const note =
    elapsed >= VERY_SLOW_AFTER_MS
      ? t('chat.waiting.verySlow')
      : elapsed >= SLOW_AFTER_MS
        ? t('chat.waiting.slow')
        : null;

  return (
    <FadeIn className="gap-2 pb-2" aria-live="polite">
      <View className="flex-row items-center gap-2.5">
        <AssistantAvatar />
        <View
          className="bg-card border-border flex-row items-center gap-1.5 rounded-full border px-4 py-3"
          aria-label={t('chat.waiting.typing')}
          role="progressbar"
        >
          <Dot delay={0} reduced={reduced} />
          <Dot delay={160} reduced={reduced} />
          <Dot delay={320} reduced={reduced} />
        </View>
      </View>
      {note ? (
        <FadeIn key={note}>
          <Text className="text-muted-foreground pl-[38px] text-sm leading-5">{note}</Text>
        </FadeIn>
      ) : null}
    </FadeIn>
  );
}
