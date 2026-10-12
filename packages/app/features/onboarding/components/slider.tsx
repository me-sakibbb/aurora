'use client';

import { useTranslation } from '@aurora/i18n';
import { cn, Icon, type IconComponent, Minus, Plus, Text } from '@aurora/ui';
import { useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, PanResponder, Platform, Pressable, View } from 'react-native';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Value picker: a big readout, a draggable track, and −/+ buttons for precise or keyboard use.
 * Built on PanResponder (no native slider dependency) so it works the same on web and Android.
 * `size="sm"` shrinks the readout so several fit on one screen.
 */
export function ValueSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  size = 'lg',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  size?: 'lg' | 'sm';
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const snap = (raw: number) => clamp(Math.round((raw - min) / step) * step + min, min, max);

  // The responder is created once; read the latest props through a ref.
  const latest = useRef({ width, value, onChange, snap });
  latest.current = { width, value, onChange, snap };
  const startX = useRef(0);

  const responder = useMemo(() => {
    const valueAt = (x: number) => {
      const { width: w, snap: s } = latest.current;
      return w > 0 ? s(min + (clamp(x, 0, w) / w) * (max - min)) : latest.current.value;
    };
    const emit = (next: number) => {
      if (next !== latest.current.value) latest.current.onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the drag when the surrounding ScrollView wants to scroll.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        startX.current = event.nativeEvent.locationX;
        emit(valueAt(startX.current));
      },
      onPanResponderMove: (_, gesture) => emit(valueAt(startX.current + gesture.dx)),
    });
  }, [min, max]);

  const fraction = (value - min) / (max - min);
  const nudge = (direction: 1 | -1) => onChange(snap(value + direction * step));

  return (
    <View className={size === 'sm' ? 'gap-3' : 'gap-8'}>
      {/* The slider announces its own value; this readout is visual only. */}
      <View aria-hidden className={cn('items-center gap-1', size === 'lg' && 'py-2')}>
        <Text
          className={cn(
            'font-semibold tracking-tight',
            size === 'sm' ? 'text-3xl leading-10' : 'text-5xl leading-[56px]',
          )}
        >
          {format(value)}
        </Text>
      </View>
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <StepButton
            label={t('onboarding.slider.decrease', { label })}
            icon={Minus}
            disabled={value <= min}
            onPress={() => nudge(-1)}
          />
          <View
            role="slider"
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={format(value)}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) =>
              nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
            }
            onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
            className={cn('h-12 flex-1 justify-center', Platform.select({ web: 'cursor-pointer' }))}
            {...responder.panHandlers}
          >
            <View pointerEvents="none" className="bg-muted h-2.5 rounded-full">
              <View
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${fraction * 100}%` }}
              />
            </View>
            <View
              pointerEvents="none"
              className="bg-card border-primary absolute h-8 w-8 rounded-full border-[3px] shadow-md shadow-black/15"
              style={{ left: clamp(fraction * width - 16, 0, Math.max(0, width - 32)) }}
            />
          </View>
          <StepButton
            label={t('onboarding.slider.increase', { label })}
            icon={Plus}
            disabled={value >= max}
            onPress={() => nudge(1)}
          />
        </View>
        <View aria-hidden className="flex-row justify-between px-14">
          <Text className="text-muted-foreground text-xs">{format(min)}</Text>
          <Text className="text-muted-foreground text-xs">{format(max)}</Text>
        </View>
      </View>
    </View>
  );
}

function StepButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: IconComponent;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      className={cn(
        'border-border bg-card h-11 w-11 items-center justify-center rounded-full border shadow-sm shadow-black/5 active:opacity-60',
        disabled && 'opacity-40',
      )}
    >
      <Icon as={icon} size={18} strokeWidth={2.5} />
    </Pressable>
  );
}
