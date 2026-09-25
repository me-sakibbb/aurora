import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { AuthFlowError, authErrorKindFromParams, toAuthErrorKind } from './errors';

const apiError = (message: string, status: number, code?: string) =>
  new AuthApiError(message, status, code);

describe('toAuthErrorKind', () => {
  it('recognises the allowlist hook rejection, whatever code wraps it', () => {
    expect(toAuthErrorKind(apiError('not_allowlisted', 403))).toBe('notApproved');
    expect(
      toAuthErrorKind(apiError('Hook error: not_allowlisted', 500, 'unexpected_failure')),
    ).toBe('notApproved');
  });

  it('keeps a wrong password distinct from not approved', () => {
    expect(toAuthErrorKind(apiError('Invalid login credentials', 400, 'invalid_credentials'))).toBe(
      'invalidCredentials',
    );
  });

  it('maps rate limiting, by code or by status', () => {
    expect(toAuthErrorKind(apiError('slow down', 429, 'over_request_rate_limit'))).toBe(
      'rateLimited',
    );
    expect(toAuthErrorKind(apiError('slow down', 429))).toBe('rateLimited');
  });

  it('maps connection failures to network', () => {
    expect(toAuthErrorKind(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
    expect(toAuthErrorKind(new TypeError('Network request failed'))).toBe('network');
  });

  it('passes through kinds decided by our own helpers', () => {
    expect(toAuthErrorKind(new AuthFlowError('accountExists'))).toBe('accountExists');
  });

  it('falls back to unknown', () => {
    expect(toAuthErrorKind(new Error('boom'))).toBe('unknown');
    expect(toAuthErrorKind(undefined)).toBe('unknown');
  });
});

describe('authErrorKindFromParams', () => {
  it('returns null when the redirect has no error', () => {
    expect(authErrorKindFromParams(new URLSearchParams('code=abc'))).toBeNull();
  });

  it('detects the allowlist rejection in an OAuth redirect', () => {
    const params = new URLSearchParams(
      'error=server_error&error_code=unexpected_failure&error_description=not_allowlisted',
    );
    expect(authErrorKindFromParams(params)).toBe('notApproved');
  });

  it('detects an expired email link', () => {
    const params = new URLSearchParams('error=access_denied&error_code=otp_expired');
    expect(authErrorKindFromParams(params)).toBe('linkExpired');
  });
});
