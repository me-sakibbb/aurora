// Single source of truth for Aurora's design tokens.
// Every consumer (Tailwind preset → NativeWind on native, Tailwind on web) reads from here.
//
// Colors are HSL triplets ("H S% L%") so Tailwind can apply opacity: `bg-primary/50`.

/**
 * Brand palette (client-provided, Sep 2026). Exact hex values in comments.
 * Prefer the semantic roles below in UI; use these directly only for illustrations and charts.
 */
const palette = {
  sage: '78 10% 43%', // #737A63
  taupe: '37 24% 64%', // #B9A88C
  ivory: '42 31% 94%', // #F4F1EA
  olive: '74 16% 16%', // #2C2F22 (dark olive)
};

/**
 * Semantic color roles, named to match react-native-reusables / shadcn so its components work as-is.
 * Contrast (WCAG) was checked for each text/background pair; ratios in comments. Notes:
 * - Primary is dark olive, not sage: ivory text on sage is only 3.97:1 (fails AA for normal text).
 * - Taupe on ivory is 2.06:1, so taupe is a surface color only (chips, secondary), never text/borders.
 * - Sage on ivory is 3.97:1: fine for icons, focus rings and large text; small text uses muted-foreground.
 */
const colors = {
  light: {
    background: palette.ivory,
    foreground: palette.olive, // 12.1:1
    card: '42 33% 97%',
    'card-foreground': palette.olive,
    popover: '42 33% 97%',
    'popover-foreground': palette.olive,
    primary: palette.olive,
    'primary-foreground': palette.ivory, // 12.1:1
    secondary: palette.taupe,
    'secondary-foreground': palette.olive, // 5.9:1
    muted: '40 22% 89%',
    'muted-foreground': '78 11% 34%', // deep sage: 5.8:1 on background, 5.2:1 on muted
    accent: palette.sage,
    'accent-foreground': palette.ivory, // 3.97:1: large/bold text and icons only
    destructive: '0 65% 45%',
    'destructive-foreground': palette.ivory,
    border: '40 18% 84%', // decorative dividers
    input: '78 10% 48%', // form field outlines need ≥3:1 against the background
    ring: palette.sage, // 3.97:1
  },
  // Token-ready only: dark mode is not designed or shipped yet (outside the quoted scope).
  dark: {
    background: '74 16% 9%',
    foreground: palette.ivory, // 15.5:1
    card: '74 14% 12%',
    'card-foreground': palette.ivory,
    popover: '74 14% 12%',
    'popover-foreground': palette.ivory,
    primary: palette.taupe, // 7.5:1 against dark text
    'primary-foreground': '74 16% 9%',
    secondary: '74 12% 18%',
    'secondary-foreground': palette.ivory,
    muted: '74 12% 16%',
    'muted-foreground': '40 12% 68%', // 6.5:1 on muted
    accent: '78 14% 60%', // lightened sage
    'accent-foreground': '74 16% 9%',
    destructive: '0 62% 50%',
    'destructive-foreground': '0 0% 100%',
    border: '74 10% 22%',
    input: '78 8% 40%',
    ring: '78 14% 60%',
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

module.exports = { palette, colors, radius, fonts };
