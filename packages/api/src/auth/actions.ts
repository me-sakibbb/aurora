import type { EmailPasswordInput } from '../schemas/auth';
import { getSupabase } from '../supabase';
import { AuthFlowError } from './errors';
import { signOutOfGoogle } from './google';
import { authRedirectUrl } from './redirect';

/**
 * Where auth emails land. `next` rides along as a query param (Supabase appends its tokens to the
 * hash), so the callback screen knows where to go once the session exists.
 */
function callbackUrl(next?: string) {
  return authRedirectUrl(
    next ? `/auth/callback?next=${encodeURIComponent(next)}` : '/auth/callback',
  );
}

export async function signInWithPassword({ email, password }: EmailPasswordInput) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export type SignUpResult = 'signedIn' | 'confirmEmail';

/** Allowlist enforcement happens server-side (auth hook); a rejection surfaces as `notApproved`. */
export async function signUpWithPassword({
  email,
  password,
}: EmailPasswordInput): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw error;
  // With email confirmation on, Supabase hides existing accounts behind a fake success whose
  // user has no identities. Treat it as "account exists" so the user is steered to sign in.
  if (data.user && data.user.identities?.length === 0) throw new AuthFlowError('accountExists');
  return data.session ? 'signedIn' : 'confirmEmail';
}

export async function resendSignUpEmail(email: string) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Turns the tokens/code in an auth redirect URL into a session. On web supabase-js already does
 * this itself (detectSessionInUrl), so this is only needed on native.
 */
export async function createSessionFromParams(params: URLSearchParams) {
  const auth = getSupabase().auth;
  const code = params.get('code');
  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }
}

/**
 * Signs out everywhere when online. Offline, the server call fails, so fall back to clearing the
 * local session: someone signing out on a shared phone must never stay signed in.
 */
export async function signOut() {
  const auth = getSupabase().auth;
  const { error } = await auth.signOut();
  if (error) await auth.signOut({ scope: 'local' });
  await signOutOfGoogle();
}

/** Returning users have finished onboarding (F2), which leaves a row in `onboarding_responses`. */
export async function fetchHasOnboarded(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('onboarding_responses')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
