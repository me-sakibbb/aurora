import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// TODO(before first Play Store upload): confirm the final application ID with the client.
// It cannot be changed after the app is published.
const APP_ID = 'com.aurora.app';

// FCM credentials for push (Expo Push uses FCM under the hood on Android). Download from the
// Firebase console into apps/mobile/ (git-ignored), or provide it as an EAS file env var.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (existsSync('./google-services.json') ? './google-services.json' : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Aurora',
  slug: 'aurora',
  scheme: 'aurora',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: APP_ID,
    googleServicesFile,
  },
  ios: {
    // Not shipped under the current contract; kept so iOS can be added later without rework.
    bundleIdentifier: APP_ID,
    supportsTablet: false,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    'expo-font',
    [
      'expo-local-authentication',
      { faceIDPermission: 'Allow Aurora to use Face ID to unlock the app.' },
    ],
    'expo-notifications',
    ['expo-splash-screen', { backgroundColor: '#F4F1EA' }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      // Filled in by `eas init`.
    },
  },
});
