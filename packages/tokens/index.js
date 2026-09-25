// Single source of truth for Aurora's design tokens.
// PLACEHOLDER VALUES: there are no designs yet. The palette borrows the olive/tan feel of the
// quotation document. Replace these once designs (or Figma Variables) exist; every consumer
// (Tailwind preset → NativeWind on native, Tailwind on web) reads from here.
//
// Colors are HSL triplets ("H S% L%") so Tailwind can apply opacity: `bg-primary/50`.

/** Semantic color roles, named to match react-native-reusables / shadcn so its components work as-is. */
const colors = {
  light: {
    background: '40 33% 98%',
    foreground: '75 14% 18%',
    card: '0 0% 100%',
    'card-foreground': '75 14% 18%',
    popover: '0 0% 100%',
    'popover-foreground': '75 14% 18%',
    primary: '75 14% 24%',
    'primary-foreground': '40 33% 98%',
    secondary: '38 36% 92%',
    'secondary-foreground': '75 14% 18%',
    muted: '40 20% 94%',
    'muted-foreground': '75 6% 42%',
    accent: '36 45% 60%',
    'accent-foreground': '75 14% 14%',
    destructive: '0 72% 51%',
    'destructive-foreground': '0 0% 100%',
    border: '40 16% 86%',
    input: '40 16% 86%',
    ring: '36 45% 60%',
  },
  // Token-ready only: dark mode is not designed or shipped yet (outside the quoted scope).
  dark: {
    background: '75 14% 8%',
    foreground: '40 33% 96%',
    card: '75 14% 11%',
    'card-foreground': '40 33% 96%',
    popover: '75 14% 11%',
    'popover-foreground': '40 33% 96%',
    primary: '36 45% 64%',
    'primary-foreground': '75 14% 10%',
    secondary: '75 10% 18%',
    'secondary-foreground': '40 33% 96%',
    muted: '75 10% 16%',
    'muted-foreground': '40 10% 65%',
    accent: '36 45% 50%',
    'accent-foreground': '40 33% 98%',
    destructive: '0 62% 50%',
    'destructive-foreground': '0 0% 100%',
    border: '75 10% 20%',
    input: '75 10% 20%',
    ring: '36 45% 60%',
  },
};

const radius = '0.75rem';

/**
 * Font family names. Native needs one family per weight (Android does not synthesize weights
 * for custom fonts); web uses a single variable font exposed as a CSS variable by next/font.
 * PLACEHOLDER: Noto Sans Bengali until the final Bengali font is chosen.
 */
const fonts = {
  native: {
    regular: 'NotoSansBengali_400Regular',
    medium: 'NotoSansBengali_500Medium',
    semibold: 'NotoSansBengali_600SemiBold',
    bold: 'NotoSansBengali_700Bold',
  },
  web: {
    sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  },
};

module.exports = { colors, radius, fonts };
