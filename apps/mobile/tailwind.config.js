const { createPreset } = require('@mybela/tokens/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/{app,ui}/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), createPreset({ platform: 'native' })],
};
