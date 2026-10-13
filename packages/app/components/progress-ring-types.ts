import type * as React from 'react';

export type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0–1, as returned by the backend. */
  progress: number;
  /** Any CSS color string (use `tokenColor()` for brand colors). */
  color: string;
  trackColor: string;
  trackOpacity?: number;
  /** Drawn centered inside the ring. */
  children?: React.ReactNode;
};
