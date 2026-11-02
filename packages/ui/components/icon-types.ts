import type * as React from 'react';

/** Any icon from `@mybela/ui` (lucide on both platforms). */
export type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}>;
