'use client';

import { cn, type IconComponent, Text } from '@aurora/ui';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { Pop } from '../../../components/pop';
import { tapHaptic } from '../../../lib/haptics';
import { IconBadge } from './visuals';

/** Knob travel: track w-14 (56) − padding 2×4 − knob 24. */
const KNOB_TRAVEL = 24;

/** A full-width on/off row (label, description, switch). The whole row is the tap target. */
export function ToggleRow({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  icon?: IconComponent;
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const knob = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.spring(knob, {
      toValue: value ? 1 : 0,
      friction: 7,
      tension: 140,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [knob, value]);

  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-label={label}
      onPress={() => {
        tapHaptic();
        onChange(!value);
      }}
      className={cn(
        'bg-card flex-row items-center gap-3.5 rounded-2xl border-2 px-4 py-4 shadow-sm shadow-black/5 active:opacity-90',
        value ? 'border-primary' : 'border-border',
      )}
    >
      {icon ? (
        <Pop active={value}>
          <IconBadge icon={icon} selected={value} />
        </Pop>
      ) : null}
      <View className="flex-1 gap-1">
        <Text className="text-base font-medium">{label}</Text>
        {description ? (
          <Text className="text-muted-foreground text-sm leading-5">{description}</Text>
        ) : null}
      </View>
      <View
        aria-hidden
        className={cn(
          'h-8 w-14 justify-center rounded-full px-1',
          value ? 'bg-primary' : 'bg-muted',
          Platform.select({ web: 'transition-colors' }),
        )}
      >
        <Animated.View
          className="bg-card h-6 w-6 rounded-full shadow-sm shadow-black/25"
          style={{
            transform: [
              {
                translateX: knob.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }),
              },
            ],
          }}
        />
      </View>
    </Pressable>
  );
}
