'use client';

import { cn, Text } from '@aurora/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  type ScrollView,
  View,
} from 'react-native';
import { tapHaptic } from '../../../lib/haptics';

const ITEM_HEIGHT = 56;
/** Rows in view; odd so one sits in the middle. */
const VISIBLE = 5;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE / 2);
/** Wait this long after scrolling stops before treating the middle year as picked. */
const SETTLE_MS = 120;
// Rows shrink and fade with distance from the middle (0 = middle, 1 = next row, 2 = edge).
const SCALES = [1, 0.78, 0.62];
const OPACITIES = [1, 0.45, 0.16];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Scrolling year picker: the year in the middle band is the value. Scroll or tap a year to pick
 * it. Rows shrink and fade smoothly as they move away from the middle, like a picker wheel.
 * A plain ScrollView (no native picker dependency), so it behaves the same on web and Android;
 * the settle timer snaps to a row on web, where scroll momentum events don't exist.
 */
export function YearWheel({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
}) {
  const years = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value((value - min) * ITEM_HEIGHT)).current;
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const offset = useRef(0);
  // Scroll events only count once the wheel has been moved to `value`. Before that the list sits
  // at the top, and reading it would pick the earliest year.
  const ready = useRef(false);
  // The year in the middle band right now (moves while scrolling, before it's picked).
  const [centered, setCentered] = useState(value);

  const scrollToYear = (year: number, animated: boolean) => {
    const y = (year - min) * ITEM_HEIGHT;
    if (Math.abs(offset.current - y) > 1) scroll.current?.scrollTo({ y, animated });
  };

  const pick = (year: number) => {
    if (year === value) return;
    tapHaptic();
    onChange(year);
  };

  // Follow changes made from outside (e.g. the starting value being filled in).
  useEffect(() => {
    setCentered(value);
    scrollToYear(value, false);
  }, [value]);

  useEffect(() => () => clearTimeout(settle.current), []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
    if (!ready.current) {
      if (Math.abs(offset.current - (value - min) * ITEM_HEIGHT) > 1) return;
      ready.current = true;
    }
    const year = clamp(min + Math.round(offset.current / ITEM_HEIGHT), min, max);
    setCentered(year);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      scrollToYear(year, true);
      pick(year);
    }, SETTLE_MS);
  };

  return (
    <View
      role="radiogroup"
      aria-label={label}
      className="self-center"
      style={{ height: ITEM_HEIGHT * VISIBLE, width: '100%', maxWidth: 320 }}
    >
      {/* The middle band: two hairlines with the picked year between them. */}
      <View
        aria-hidden
        pointerEvents="none"
        className="border-sage/40 absolute inset-x-6 border-y"
        style={{ top: PAD, height: ITEM_HEIGHT }}
      />
      <Animated.ScrollView
        ref={scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: Platform.OS !== 'web',
          listener: onScroll,
        })}
        // Position once the rows exist (scrolling earlier is a no-op on web).
        onContentSizeChange={() => {
          if (ready.current) return;
          scrollToYear(value, false);
          if (Math.abs(offset.current - (value - min) * ITEM_HEIGHT) <= 1) ready.current = true;
        }}
        contentContainerStyle={{ paddingVertical: PAD }}
        className={cn(Platform.select({ web: 'overscroll-contain' }))}
      >
        {years.map((year, index) => {
          const center = index * ITEM_HEIGHT;
          const inputRange = [-2, -1, 0, 1, 2].map((rows) => center + rows * ITEM_HEIGHT);
          const byDistance = (values: number[]) =>
            scrollY.interpolate({
              inputRange,
              outputRange: [2, 1, 0, 1, 2].map((d) => values[d] as number),
              extrapolate: 'clamp',
            });
          const isCentered = year === centered;
          return (
            <Pressable
              key={year}
              role="radio"
              aria-checked={year === value}
              aria-label={String(year)}
              onPress={() => {
                clearTimeout(settle.current);
                setCentered(year);
                scrollToYear(year, true);
                pick(year);
              }}
              className="items-center justify-center"
              style={{ height: ITEM_HEIGHT }}
            >
              <Animated.View
                style={{
                  opacity: byDistance(OPACITIES),
                  transform: [{ scale: byDistance(SCALES) }],
                }}
              >
                <Text
                  className={cn(
                    'text-[34px] leading-[44px] tracking-tight',
                    isCentered ? 'text-primary font-semibold' : 'text-foreground font-medium',
                  )}
                >
                  {year}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}
