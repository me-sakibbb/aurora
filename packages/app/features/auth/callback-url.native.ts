import * as Linking from 'expo-linking';

/** Native: the deep link (aurora://auth/callback…) that opened or resumed the app. */
export function useCallbackUrl(): string | null {
  return Linking.useLinkingURL();
}
