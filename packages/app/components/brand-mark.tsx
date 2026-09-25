import { cn } from '@aurora/ui';
import { View } from 'react-native';

const SIZES = {
  md: { box: 'h-11 w-11 rounded-xl', sun: 'h-[11px] w-[22px] rounded-t-[11px]', band: 'h-[5px]' },
  lg: { box: 'h-16 w-16 rounded-2xl', sun: 'h-4 w-8 rounded-t-2xl', band: 'h-[7px]' },
} as const;

/**
 * Placeholder logo until a real one exists: a taupe sun rising over a sage horizon in an olive tile
 * (dawn = aurora). Built from Views so it needs no image or SVG on either platform.
 */
export function BrandMark({
  size = 'md',
  inverted = false,
}: {
  size?: keyof typeof SIZES;
  /** For dark backgrounds: ivory tile instead of olive. */
  inverted?: boolean;
}) {
  const s = SIZES[size];
  return (
    <View
      aria-hidden
      className={cn(
        'items-center justify-end overflow-hidden',
        inverted ? 'bg-ivory' : 'bg-primary',
        s.box,
      )}
    >
      <View className={cn('bg-taupe', s.sun)} />
      <View className={cn('bg-sage w-full', s.band)} />
    </View>
  );
}
