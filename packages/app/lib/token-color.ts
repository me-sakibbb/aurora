import { palette } from '@aurora/tokens';

/**
 * A brand color as a CSS/SVG color string, for props that can't take a className (SVG strokes).
 * Uses the comma syntax (`hsl(37, 24%, 64%)`), which react-native-svg also parses.
 */
export function tokenColor(name: keyof typeof palette): string {
  return `hsl(${palette[name].split(' ').join(', ')})`;
}
