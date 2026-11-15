import { useWindowDimensions } from 'react-native';

/** Same API as dimensions.ts (web). On a phone the app fills the screen. */
export const APP_MAX_WIDTH = 480;

export function useAppDimensions() {
  const { width, height } = useWindowDimensions();
  return { width, height };
}
