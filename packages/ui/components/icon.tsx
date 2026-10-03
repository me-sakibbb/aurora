// Web: lucide-react renders plain inline SVG, so react-native-svg stays out of the web bundle.
// Native twin: icon.native.tsx (lucide-react-native). Both export the same API.
// Icons draw with `currentColor`, so a text color class (`text-primary`) sets their color.
import { cn } from '@aurora/ui/lib/utils';
import type { IconComponent } from './icon-types';

export type { IconComponent } from './icon-types';

export function Icon({
  as: Component,
  size = 20,
  strokeWidth = 2,
  className,
}: {
  as: IconComponent;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden
      className={cn('text-foreground shrink-0', className)}
    />
  );
}

export * from '../icons';
