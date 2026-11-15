'use client';

import type { MoodLevel, MoodScale, MoodTag } from '@mybela/api';
import {
  BedDouble,
  Briefcase,
  cn,
  Droplet,
  Dumbbell,
  GraduationCap,
  Heart,
  HeartHandshake,
  type IconComponent,
  Plane,
  Thermometer,
  Trees,
  Users,
  Utensils,
} from '@mybela/ui';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { MoonPhase } from '../../../components/moon-phase';
import { StressGauge } from '../../../components/stress-gauge';

export const TAG_ICONS: Record<MoodTag, IconComponent> = {
  work: Briefcase,
  study: GraduationCap,
  family: Users,
  friends: HeartHandshake,
  partner: Heart,
  exercise: Dumbbell,
  outdoors: Trees,
  rest: BedDouble,
  food: Utensils,
  travel: Plane,
  unwell: Thermometer,
  period: Droplet,
};

/** Background tone per mood level (tokens in packages/tokens: `mood`). */
export const MOOD_TONE: Record<MoodLevel, string> = {
  1: 'bg-mood-1',
  2: 'bg-mood-2',
  3: 'bg-mood-3',
  4: 'bg-mood-4',
  5: 'bg-mood-5',
};

/** A soft wash of the same tone, for halos behind a face. */
export const MOOD_HALO: Record<MoodLevel, string> = {
  1: 'bg-mood-1/40',
  2: 'bg-mood-2/40',
  3: 'bg-mood-3/40',
  4: 'bg-mood-4/40',
  5: 'bg-mood-5/40',
};

/** Battery charge per energy answer: a tone that warms as it fills. */
const CHARGE_TONE: Record<MoodLevel, string> = MOOD_TONE;

/**
 * An upright battery filled to the energy answer (1 = nearly empty, 5 = full). Plain views, so it
 * looks the same on web and Android.
 */
export function Battery({
  level,
  height = 44,
  inverted = false,
}: {
  level: MoodLevel;
  height?: number;
  /** On a dark (primary) surface. */
  inverted?: boolean;
}) {
  const width = Math.round(height * 0.56);
  const border = Math.max(2, Math.round(height / 22));
  const inner = height - border * 2 - 4;
  return (
    <View className="items-center">
      <View
        style={{ width: width * 0.42, height: Math.max(3, height * 0.08) }}
        className={cn('rounded-t-sm', inverted ? 'bg-primary-foreground' : 'bg-foreground/70')}
      />
      <View
        style={{ width, height, borderWidth: border, padding: 2 }}
        className={cn(
          'justify-end rounded-[6px]',
          inverted ? 'border-primary-foreground' : 'border-foreground/70',
        )}
      >
        <View
          style={{ height: Math.max(3, (inner * level) / 5) }}
          className={cn('w-full rounded-[3px]', CHARGE_TONE[level])}
        />
      </View>
    </View>
  );
}

/**
 * The glyph for an energy / sleep / stress answer, sized to sit in a square `slot` (px) so the
 * three look the same size side by side: a battery, a moon phase, a small gauge.
 */
export function ScaleGlyph({
  scale,
  level,
  slot = 24,
}: {
  scale: MoodScale;
  level: MoodLevel;
  slot?: number;
}) {
  // Battery height excludes its cap (+8%), so it lands just inside the slot.
  if (scale === 'energy') return <Battery level={level} height={Math.round(slot * 0.82)} />;
  if (scale === 'sleep') return <MoonPhase level={level} size={Math.round(slot * 0.95)} />;
  // The gauge is a half circle: twice as wide as tall, so it gets more width for the same height.
  return <StressGauge value={level} width={Math.round(slot * 1.5)} />;
}

/**
 * The width a row actually has, so a row of five faces (or tiles) can size itself to fit instead
 * of overflowing on narrow phones. 0 until the first layout pass.
 */
export function useRowWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  };
  return { width, onLayout };
}

/** The face size that fits five across `width`, given each item's padding/border and the gaps. */
export function fitFive(
  width: number,
  { chrome, gap, max }: { chrome: number; gap: number; max: number },
) {
  if (width <= 0) return 0;
  return Math.max(28, Math.min(max, Math.floor((width - gap * 4) / 5) - chrome));
}
