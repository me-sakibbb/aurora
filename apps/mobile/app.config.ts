import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// TODO(before first Play Store upload): confirm the final application ID with the client.
// It cannot be changed after the app is published.
const APP_ID = 'com.aurora.app';
const EAS_PROJECT_ID = '766e5e4c-9acf-45be-b96d-b95bcc251249';

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
  // EAS Update: JS-only changes ship with `pnpm update:preview` instead of a rebuild. The
  // fingerprint policy changes the runtime version whenever native code changes, so an update is
  // only ever delivered to builds whose native side it matches.
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
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
    'expo-image',
    // @react-native-google-signin/google-signin needs no config plugin on Android (autolinked).
    // If iOS is added later, add ['@react-native-google-signin/google-signin', { iosUrlScheme }].
    // Placeholder transparent logo until designs land; Android fails resource linking without an image.
    [
      'expo-splash-screen',
      { backgroundColor: '#F4F1EA', image: './assets/splash-icon.png', imageWidth: 200 },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
});
