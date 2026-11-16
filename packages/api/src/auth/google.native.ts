import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { env } from '../env';
import { getSupabase } from '../supabase';
import { requestBetaAccess } from './access';

export type GoogleSignInResult = { cancelled: boolean };

let configured = false;

function configure() {
  if (configured) return;
  if (!env.googleWebClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. See apps/mobile/.env.example.');
  }
  if (Platform.OS === 'ios' && !env.googleIosClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is not set. See apps/mobile/.env.example.');
  }
  // webClientId sets the ID token audience Supabase checks; iOS also needs its own client ID.
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
  });
  configured = true;
}

/**
 * Android/iOS: native account picker (no browser hop), then the Google ID token is exchanged for a
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
    // Beta: register the account as `pending` so the allowlist hook lets it sign up.
    if (response.data.user.email) await requestBetaAccess(response.data.user.email);

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
    // The UI only shows a generic message; this keeps the real cause visible in `adb logcat` / Xcode logs.
    console.warn('[auth] Google sign-in failed', isErrorWithCode(error) ? error.code : '', error);
    throw error;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  if (!configured) return;
  await GoogleSignin.signOut().catch(() => {});
}
