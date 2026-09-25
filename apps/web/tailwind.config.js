const { createPreset } = require('@aurora/tokens/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/{app,ui}/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), createPreset({ platform: 'web' })],
  // react-native-web injects its own reset classes (e.g. `.css-view-xyz { background-color:
  // transparent; flex-direction: column }`) after this stylesheet. Same specificity + later = RNW
  // wins, silently cancelling colors and layout. Scoping utilities under `html` makes ours win.
  important: 'html',
  future: {
    hoverOnlyWhenSupported: true,
  },
};
