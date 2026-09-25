import { isAuthApiError, isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Contract with the backend: the "before user created" auth hook rejects emails that aren't on the
 * allowlist with this exact message, e.g. `{ error: { http_code: 403, message: 'not_allowlisted' } }`.
 * It reaches the app as an API error (email sign-up, Google ID token) or in the OAuth redirect URL
 * (`error_description=not_allowlisted`, Google on web).
 */
export const NOT_ALLOWLISTED = 'not_allowlisted';

/** What the UI needs to know about a failed auth call. Each kind has its own copy (auth.errors.*). */
export type AuthErrorKind =
  | 'notApproved'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'accountExists'
  | 'weakPassword'
  | 'samePassword'
  | 'rateLimited'
  | 'network'
  | 'linkExpired'
  | 'unknown';

/** Thrown by our own auth helpers when the outcome is already known (e.g. sign-up of an existing email). */
export class AuthFlowError extends Error {
  constructor(readonly kind: AuthErrorKind) {
    super(kind);
    this.name = 'AuthFlowError';
  }
}

const NETWORK_MESSAGES = [
  'failed to fetch',
  'network request failed',
  'load failed',
  'networkerror',
];

export function toAuthErrorKind(error: unknown): AuthErrorKind {
  if (error instanceof AuthFlowError) return error.kind;

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes(NOT_ALLOWLISTED)) return 'notApproved';

  if (isAuthRetryableFetchError(error)) return 'network';
  if (NETWORK_MESSAGES.some((m) => message.includes(m))) return 'network';

  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'invalidCredentials';
      case 'email_not_confirmed':
        return 'emailNotConfirmed';
      case 'user_already_exists':
      case 'email_exists':
        return 'accountExists';
      case 'weak_password':
        return 'weakPassword';
      case 'same_password':
        return 'samePassword';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return 'rateLimited';
      case 'otp_expired':
      case 'flow_state_expired':
      case 'flow_state_not_found':
      case 'bad_code_verifier':
        return 'linkExpired';
    }
    if (isAuthApiError(error) && error.status === 429) return 'rateLimited';
  }
  return 'unknown';
}

/**
 * Reads an auth error that Supabase put in a redirect URL (OAuth or email link), from either the
 * query string or the hash. Returns null when the URL carries no error.
 */
export function authErrorKindFromParams(params: URLSearchParams): AuthErrorKind | null {
  const error = params.get('error');
  const code = params.get('error_code');
  const description = params.get('error_description') ?? '';
  if (!error && !code) return null;

  if (description.toLowerCase().includes(NOT_ALLOWLISTED)) return 'notApproved';
  if (code === 'otp_expired' || code === 'flow_state_expired') return 'linkExpired';
  if (error === 'access_denied' && !code) return 'linkExpired';
  return 'unknown';
}
