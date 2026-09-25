// Tailwind preset shared by apps/mobile (NativeWind) and apps/web (Tailwind + NativeWind).
// Usage: presets: [require('nativewind/preset'), createPreset({ platform: 'native' | 'web' })]
const plugin = require('tailwindcss/plugin');
const { palette, colors, radius, fonts } = require('./index.js');

const toCssVars = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--${k}`, v]));

// Same format react-native-reusables uses; Tailwind ≥3.3 still supports opacity modifiers on it.
const colorRef = (name) => `hsl(var(--${name}))`;

const themeColors = {
  // Fixed brand colors (same in light and dark): `bg-sage`, `text-olive`, `bg-taupe/40`.
  ...Object.fromEntries(Object.keys(palette).map((name) => [name, `hsl(${palette[name]})`])),
  border: colorRef('border'),
  input: colorRef('input'),
  ring: colorRef('ring'),
  background: colorRef('background'),
  foreground: colorRef('foreground'),
  ...Object.fromEntries(
    ['primary', 'secondary', 'destructive', 'muted', 'accent', 'popover', 'card'].map((name) => [
      name,
      { DEFAULT: colorRef(name), foreground: colorRef(`${name}-foreground`) },
    ]),
  ),
};

/** @param {{ platform: 'native' | 'web' }} options */
function createPreset({ platform }) {
  const isNative = platform === 'native';

  return {
    darkMode: 'class',
    theme: {
      extend: {
        colors: themeColors,
        borderRadius: {
          xl: `calc(${radius} + 4px)`,
          lg: radius,
          md: `calc(${radius} - 2px)`,
          sm: `calc(${radius} - 4px)`,
        },
        fontFamily: {
          sans: isNative ? [fonts.native.regular] : fonts.web.sans,
        },
      },
    },
    plugins: [
      plugin(({ addBase, addUtilities }) => {
        addBase({
          ':root': { ...toCssVars(colors.light), '--radius': radius },
          '.dark:root': toCssVars(colors.dark),
        });
        if (isNative) {
          // Map weight utilities to the matching font file on native.
          addUtilities({
            '.font-medium': { fontFamily: fonts.native.medium },
            '.font-semibold': { fontFamily: fonts.native.semibold },
            '.font-bold': { fontFamily: fonts.native.bold },
            '.font-extrabold': { fontFamily: fonts.native.bold },
          });
        }
      }),
    ],
  };
}

module.exports = { createPreset };
