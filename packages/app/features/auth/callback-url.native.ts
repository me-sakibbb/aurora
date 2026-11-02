import * as Linking from 'expo-linking';

/** Native: the deep link (mybela://auth/callback…) that opened or resumed the app. */
export function useCallbackUrl(): string | null {
  return Linking.useLinkingURL();
}
