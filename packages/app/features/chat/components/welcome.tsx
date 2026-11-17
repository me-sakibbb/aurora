'use client';

import { useTranslation } from '@mybela/i18n';
import {
  ChevronRight,
  cn,
  Droplet,
  Icon,
  type IconComponent,
  Languages,
  Salad,
  Smile,
  Sunrise,
  Text,
  Utensils,
} from '@mybela/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { BrandMark } from '../../../components/brand-mark';
import { FadeIn } from '../../../components/fade-in';
import { useReducedMotion } from '../../../lib/use-reduced-motion';

cssInterop(Animated.View, { className: 'style' });

type StarterKey = 'breakfast' | 'calories' | 'energy' | 'period' | 'routine';

const STARTERS: Record<StarterKey, IconComponent> = {
  breakfast: Sunrise,
  calories: Utensils,
  energy: Smile,
  period: Droplet,
  routine: Salad,
};

/** A slow, soft halo behind the mark: MyBela is here and listening. */
function Halo() {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, reduced]);

  return (
    <Animated.View
      aria-hidden
      className="bg-sage/25 absolute h-28 w-28 rounded-full"
      style={{
        opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        transform: [
          { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.08] }) },
        ],
      }}
    />
  );
}

/**
 * A new conversation: a warm hello and a few questions to start from (tapping one sends it). The
 * period question only shows for accounts with cycle tracking on (F13).
 */
export function ChatWelcome({
  name,
  cycleEnabled,
  onAsk,
  disabled,
}: {
  name: string;
  cycleEnabled: boolean;
  onAsk: (text: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const keys: StarterKey[] = [
    'breakfast',
    'calories',
    'energy',
    cycleEnabled ? 'period' : 'routine',
  ];

  return (
    <View className="mx-auto w-full max-w-md flex-1 justify-center gap-7 px-5 py-8">
      <FadeIn className="items-center gap-5">
        <View className="h-28 w-28 items-center justify-center">
          <Halo />
          <BrandMark size="lg" />
        </View>
        <View className="items-center gap-2">
          <Text
            role="heading"
            aria-level={2}
            className="text-center text-[26px] font-bold leading-8 tracking-tight"
          >
            {name ? t('chat.welcome.titleNamed', { name }) : t('chat.welcome.title')}
          </Text>
          <Text className="text-muted-foreground max-w-xs text-center leading-6">
            {t('chat.welcome.body')}
          </Text>
        </View>
      </FadeIn>

      <View className="gap-2.5">
        {keys.map((key, index) => {
          const prompt = t(`chat.starters.${key}`);
          return (
            <FadeIn key={key} delay={120 + index * 70}>
              <Pressable
                onPress={() => onAsk(prompt)}
                disabled={disabled}
                role="button"
                className={cn(
                  'bg-card border-border active:bg-muted flex-row items-center gap-3.5 rounded-2xl border px-4 py-3.5 shadow-sm shadow-black/5',
                  Platform.select({ web: 'transition-colors hover:bg-muted' }),
                  disabled && 'opacity-60',
                )}
              >
                <View className="bg-sage/15 h-9 w-9 items-center justify-center rounded-xl">
                  <Icon as={STARTERS[key]} size={18} className="text-olive" />
                </View>
                <Text className="flex-1 font-medium leading-[22px]">{prompt}</Text>
                <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
              </Pressable>
            </FadeIn>
          );
        })}
      </View>

      <FadeIn delay={460} className="flex-row items-center justify-center gap-1.5">
        <Icon as={Languages} size={14} className="text-muted-foreground" />
        <Text className="text-muted-foreground text-center text-xs">
          {t('chat.welcome.languages')}
        </Text>
      </FadeIn>
    </View>
  );
}
