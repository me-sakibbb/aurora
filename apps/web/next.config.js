const path = require('node:path');

// Based on Solito's reference config: alias react-native → react-native-web, prefer .web.* files,
// and transpile the React Native packages + our workspace packages (they ship untranspiled TS/JSX).

const rnwAliases = {
  'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
  'react-native/Libraries/vendor/emitter/EventEmitter$':
    'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
  'react-native/Libraries/EventEmitter/NativeEventEmitter$':
    'react-native-web/dist/vendor/react-native/NativeEventEmitter',
};

const webExtensions = ['.web.js', '.web.jsx', '.web.ts', '.web.tsx'];

/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: [
    'react-native',
    'react-native-web',
    'react-native-reanimated',
    'react-native-worklets',
    'react-native-safe-area-context',
    'react-native-css-interop',
    'nativewind',
    'solito',
    '@rn-primitives/slot',
    '@aurora/api',
    '@aurora/app',
    '@aurora/i18n',
    '@aurora/ui',
  ],
  compiler: {
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    },
  },
  reactStrictMode: false, // Reanimated does not support strict mode on web.

  // Turbopack (default for `next dev` and `next build`).
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    resolveAlias: {
      'react-native': 'react-native-web',
      ...rnwAliases,
    },
    resolveExtensions: [...webExtensions, '.js', '.mjs', '.tsx', '.ts', '.jsx', '.json', '.wasm'],
  },

  // Webpack fallback (`next build --webpack`).
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'react-native$': 'react-native-web',
      ...rnwAliases,
    };
    config.resolve.extensions = [...webExtensions, ...(config.resolve.extensions ?? [])];
    return config;
  },
};
