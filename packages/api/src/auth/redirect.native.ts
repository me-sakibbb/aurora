import * as Linking from 'expo-linking';

// Native: auth emails open the app through the `mybela://` scheme (e.g. mybela://auth/callback).
// Every URL used here must be listed in Supabase → Auth → URL Configuration → Redirect URLs.
export function authRedirectUrl(path: string): string {
  return Linking.createURL(path);
}
