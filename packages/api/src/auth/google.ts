import { getSupabase } from '../supabase';
import { authRedirectUrl } from './redirect';

export type GoogleSignInResult = { cancelled: boolean };

/**
 * Web: full-page redirect to Google, back to /auth/callback. The promise resolves just before
 * the browser navigates away; the session is picked up from the URL on return.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl('/auth/callback'),
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  return { cancelled: false };
}

/** Web keeps no Google state of its own, so there's nothing to clear. */
export async function signOutOfGoogle(): Promise<void> {}
