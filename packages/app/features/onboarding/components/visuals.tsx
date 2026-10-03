'use client';

import type { BodyType } from '@aurora/api';
import {
  BodyAthletic,
  BodyAverage,
  BodyFull,
  BodySlim,
  cn,
  Droplet,
  Icon,
  type IconComponent,
} from '@aurora/ui';
import { Platform, View } from 'react-native';

/** Rounded square holding an icon. Inverts when its card is selected. */
export function IconBadge({
  icon,
  selected = false,
  size = 'md',
}: {
  icon: IconComponent;
  selected?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <View
      aria-hidden
      className={cn(
        'items-center justify-center',
        size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl',
        selected ? 'bg-primary' : 'bg-muted',
      )}
    >
      <Icon
        as={icon}
        size={size === 'lg' ? 26 : 20}
        className={selected ? 'text-primary-foreground' : 'text-muted-foreground'}
      />
    </View>
  );
}

/** Large icon in soft concentric rings, used at the top of explainer steps. */
export function HeroIcon({ icon }: { icon: IconComponent }) {
  return (
    <View aria-hidden className="items-center justify-center self-center py-2">
      <View className="bg-sage/10 h-36 w-36 items-center justify-center rounded-full">
        <View className="bg-sage/15 h-24 w-24 items-center justify-center rounded-full">
          <View className="bg-primary h-16 w-16 items-center justify-center rounded-full shadow-sm shadow-black/20">
            <Icon as={icon} size={30} className="text-primary-foreground" />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Decorative "aurora" glows behind the page. Blurred on web; very faint on native. */
export function AuroraGlow() {
  const blur = Platform.select({ web: 'blur-3xl' });
  return (
    <View aria-hidden pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View
        className={cn(
          'absolute -right-24 -top-32 h-80 w-80 rounded-full',
          blur ? 'bg-sage/25' : 'bg-sage/10',
          blur,
        )}
      />
      <View
        className={cn(
          'absolute -left-32 top-40 h-72 w-72 rounded-full',
          blur ? 'bg-taupe/30' : 'bg-taupe/10',
          blur,
        )}
      />
    </View>
  );
}

const FIGURES: Record<BodyType, IconComponent> = {
  slim: BodySlim,
  average: BodyAverage,
  athletic: BodyAthletic,
  full: BodyFull,
};

/** A body silhouette for each body type. */
export function BodyFigure({ type, selected }: { type: BodyType; selected: boolean }) {
  return (
    <View
      aria-hidden
      className={cn(
        'h-20 w-16 items-center justify-center rounded-2xl',
        selected ? 'bg-primary' : 'bg-muted',
      )}
    >
      <Icon
        as={FIGURES[type]}
        size={56}
        className={selected ? 'text-primary-foreground' : 'text-muted-foreground'}
      />
    </View>
  );
}

/** One to three drops, for the oil question. */
export function OilDrops({ count, selected }: { count: 1 | 2 | 3; selected: boolean }) {
  return (
    <View
      aria-hidden
      className={cn(
        'h-11 w-11 flex-row items-center justify-center rounded-xl',
        selected ? 'bg-primary' : 'bg-muted',
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className={cn(count > 1 && '-mx-0.5')}>
          <Icon
            as={Droplet}
            size={count === 1 ? 20 : 13}
            className={selected ? 'text-primary-foreground' : 'text-muted-foreground'}
          />
        </View>
      ))}
    </View>
  );
}
