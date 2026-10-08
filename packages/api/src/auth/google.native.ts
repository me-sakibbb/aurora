import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { env } from '../env';
import { getSupabase } from '../supabase';

export type GoogleSignInResult = { cancelled: boolean };

let configured = false;

function configure() {
  if (configured) return;
  if (!env.googleWebClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. See apps/mobile/.env.example.');
  }
  GoogleSignin.configure({ webClientId: env.googleWebClientId });
  configured = true;
}

/**
 * Android: native account picker (no browser hop), then the Google ID token is exchanged for a
 * Supabase session. The allowlist hook runs on that exchange, so a rejection arrives as an error here.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { cancelled: true };

    const token = response.data.idToken;
    if (!token) throw new Error('Google did not return an ID token.');

    const { error } = await getSupabase().auth.signInWithIdToken({ provider: 'google', token });
    if (error) {
      // Forget the Google account so "Try a different account" shows the picker again.
      await GoogleSignin.signOut().catch(() => {});
      throw error;
    }
    return { cancelled: false };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)
    ) {
      return { cancelled: true };
    }
    // The UI only shows a generic message; this keeps the real cause visible in `adb logcat`.
    console.warn('[auth] Google sign-in failed', isErrorWithCode(error) ? error.code : '', error);
    throw error;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  if (!configured) return;
  await GoogleSignin.signOut().catch(() => {});
}
