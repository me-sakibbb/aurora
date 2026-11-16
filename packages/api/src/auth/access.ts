/**
 * TEMPORARY beta access guard (planned to be removed about a month after 2026-11-16).
 *
 * The auth hooks let anyone with an `allowlist` row in, whatever its `status`. So people outside
 * the beta are registered as `pending` before they sign up (via the public
 * `POST /allowlist/check`), which lets them create an account and finish onboarding. The app then
 * reads their own row (RLS policy `allowlist_read_own`) and shows "access pending" until an admin
 * approves them. This guard lives only in the front end: it is a UX gate, not a security boundary.
 *
 * To remove it: delete this file and its uses (`useAccessStatus`, `PendingApprovalScreen`,
 * the calls in `signUpWithPassword` / native `signInWithGoogle`).
 */
import { apiFetch, isApiConfigured } from '../backend';
import { getSupabase } from '../supabase';

export type AccessStatus = 'approved' | 'pending';

/**
 * Registers this email as `pending` if it isn't on the allowlist yet. Best effort: when it fails,
 * signup goes ahead and the auth hook's "not on the allowlist" rejection is shown instead.
 */
export async function requestBetaAccess(email: string): Promise<void> {
  if (!isApiConfigured()) return;
  try {
    await apiFetch('/allowlist/check', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), add_if_missing: true },
    });
  } catch (error) {
    console.warn('[auth] could not request beta access', error);
  }
}

/**
 * The signed-in user's beta status. No row means staff (the hooks let staff in without one),
 * so only an explicit `pending` row holds someone back.
 */
export async function fetchAccessStatus(email: string): Promise<AccessStatus> {
  const { data, error } = await getSupabase()
    .from('allowlist')
    .select('status')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data?.status === 'pending' ? 'pending' : 'approved';
}
