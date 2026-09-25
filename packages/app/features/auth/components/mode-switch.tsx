'use client';

import { cn, Text } from '@aurora/ui';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

/** Two-option segmented control (Sign in / Create account) with a sliding selection pill. */
export function ModeSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const position = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    // `left` is a layout prop, so no native driver; it's a 200ms tween on a tiny view.
    const animation = Animated.timing(position, {
      toValue: index,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [position, index]);

  // Percentages rather than measured pixels, so the pill is placed correctly in the SSR HTML too.
  const segment = 100 / options.length;
  const left = position.interpolate({
    inputRange: options.map((_, i) => i),
    outputRange: options.map((_, i) => `${i * segment}%`),
  });

  return (
    <View className="bg-muted rounded-xl p-1">
      <View role="tablist" className="flex-row">
        <Animated.View
          aria-hidden
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, width: `${segment}%`, left }}
        >
          <View className="bg-card flex-1 rounded-lg shadow-sm shadow-black/10" />
        </Animated.View>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              role="tab"
              aria-selected={selected}
              onPress={() => onChange(option.value)}
              className="h-10 flex-1 items-center justify-center rounded-lg px-2"
            >
              <Text
                numberOfLines={1}
                className={cn(
                  'text-sm font-medium',
                  selected ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
