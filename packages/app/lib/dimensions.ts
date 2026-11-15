'use client';

import { useWindowDimensions } from 'react-native';

/**
 * The app is phone-first everywhere: on a computer the web build is drawn in a centred column of
 * this width (see apps/web/app/globals.css, `.app-frame`), so layouts never go wide.
 */
export const APP_MAX_WIDTH = 480;

/**
 * The size the app is actually drawn at. Use this, not `useWindowDimensions`, for any layout
 * decision: on web the window can be far wider than the phone-width frame.
 * Native twin: dimensions.native.ts.
 */
export function useAppDimensions() {
  const { width, height } = useWindowDimensions();
  return { width: Math.min(width, APP_MAX_WIDTH), height };
}
