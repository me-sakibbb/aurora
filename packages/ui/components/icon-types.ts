import type * as React from 'react';

/** Any icon from `@aurora/ui` (lucide on both platforms). */
export type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}>;
