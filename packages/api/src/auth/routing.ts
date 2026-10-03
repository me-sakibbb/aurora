export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
/** `unknown` while the onboarding check is loading or has failed with nothing cached. */
export type OnboardingState = 'unknown' | 'pending' | 'complete';

/** Only for signed-out people. Signed-in users are sent on to the app. */
export const GUEST_ROUTES = ['/login', '/forgot-password'];
/** Reachable in any state: they finish an auth flow themselves. */
export const OPEN_ROUTES = ['/auth/callback', '/reset-password'];
export const ONBOARDING_ROUTE = '/onboarding';
export const HOME_ROUTE = '/';

function normalize(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * Only same-app paths are allowed as a post-login destination (no `//evil.com` open redirects),
 * and never a page that would bounce straight back (login, the callback itself).
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  const path = normalize(next.split('?')[0] ?? next);
  if (GUEST_ROUTES.includes(path) || path === '/auth/callback') return null;
  return next;
}

/** Query string and hash of an auth redirect URL, merged (Supabase uses both). */
export function paramsFromUrl(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => {
    params.set(key, value);
  });
  return params;
}

/**
 * Where the current visitor should be. Returns null to stay put.
 * - Signed out: the app root → /onboarding (Welcome and the pre-sign-up questions are answered
 *   signed out); any other app page → /login (remembering the page as `next`).
 * - Signed in but onboarding not done → /onboarding. Done → never back to /onboarding.
 * - Signed in on /login → `next` (if safe) or home.
 */
export function resolveAuthRedirect({
  status,
  pathname,
  onboarding,
  next,
}: {
  status: AuthStatus;
  pathname: string;
  onboarding: OnboardingState;
  next?: string | null;
}): string | null {
  const path = normalize(pathname);
  if (status === 'loading' || OPEN_ROUTES.includes(path)) return null;

  const isGuestRoute = GUEST_ROUTES.includes(path);
  if (status === 'signedOut') {
    if (isGuestRoute || path === ONBOARDING_ROUTE) return null;
    return path === HOME_ROUTE ? ONBOARDING_ROUTE : `/login?next=${encodeURIComponent(path)}`;
  }

  if (onboarding === 'unknown') return null;
  if (onboarding === 'pending') return path === ONBOARDING_ROUTE ? null : ONBOARDING_ROUTE;
  if (isGuestRoute) return safeNextPath(next) ?? HOME_ROUTE;
  if (path === ONBOARDING_ROUTE) return HOME_ROUTE;
  return null;
}
