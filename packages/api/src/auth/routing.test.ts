import { paramsFromUrl, resolveAuthRedirect, safeNextPath } from './routing';

describe('resolveAuthRedirect', () => {
  it('waits while the session is loading', () => {
    expect(
      resolveAuthRedirect({ status: 'loading', pathname: '/', onboarding: 'unknown' }),
    ).toBeNull();
  });

  it('starts signed-out visitors at onboarding (welcome + pre-sign-up questions)', () => {
    expect(resolveAuthRedirect({ status: 'signedOut', pathname: '/', onboarding: 'unknown' })).toBe(
      '/onboarding',
    );
    expect(
      resolveAuthRedirect({ status: 'signedOut', pathname: '/onboarding', onboarding: 'unknown' }),
    ).toBeNull();
  });

  it('sends signed-out visitors on app pages to login, remembering deep links', () => {
    expect(
      resolveAuthRedirect({ status: 'signedOut', pathname: '/mood', onboarding: 'unknown' }),
    ).toBe('/login?next=%2Fmood');
    expect(
      resolveAuthRedirect({ status: 'signedOut', pathname: '/login', onboarding: 'unknown' }),
    ).toBeNull();
  });

  it('never interrupts the callback and reset-password flows', () => {
    for (const status of ['signedOut', 'signedIn'] as const) {
      expect(
        resolveAuthRedirect({ status, pathname: '/auth/callback', onboarding: 'pending' }),
      ).toBeNull();
      expect(
        resolveAuthRedirect({ status, pathname: '/reset-password', onboarding: 'complete' }),
      ).toBeNull();
    }
  });

  it('holds signed-in users in place until onboarding status is known', () => {
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/login', onboarding: 'unknown' }),
    ).toBeNull();
  });

  it('sends new users to onboarding from anywhere', () => {
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/login', onboarding: 'pending' }),
    ).toBe('/onboarding');
    expect(resolveAuthRedirect({ status: 'signedIn', pathname: '/', onboarding: 'pending' })).toBe(
      '/onboarding',
    );
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/onboarding', onboarding: 'pending' }),
    ).toBeNull();
  });

  it('sends returning users home, or to where they were headed', () => {
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/login', onboarding: 'complete' }),
    ).toBe('/');
    expect(
      resolveAuthRedirect({
        status: 'signedIn',
        pathname: '/login',
        onboarding: 'complete',
        next: '/mood',
      }),
    ).toBe('/mood');
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/onboarding', onboarding: 'complete' }),
    ).toBe('/');
    expect(
      resolveAuthRedirect({ status: 'signedIn', pathname: '/', onboarding: 'complete' }),
    ).toBeNull();
  });
});

describe('safeNextPath', () => {
  it('only allows in-app paths', () => {
    expect(safeNextPath('/mood?day=1')).toBe('/mood?day=1');
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath('/login')).toBeNull();
    expect(safeNextPath('/auth/callback')).toBeNull();
    expect(safeNextPath('/reset-password')).toBe('/reset-password');
    expect(safeNextPath(null)).toBeNull();
  });
});

describe('paramsFromUrl', () => {
  it('merges query and hash params from web and native URLs', () => {
    const params = paramsFromUrl(
      'aurora://auth/callback?next=%2Freset-password#access_token=a&refresh_token=r&type=recovery',
    );
    expect(params.get('next')).toBe('/reset-password');
    expect(params.get('access_token')).toBe('a');
    expect(params.get('type')).toBe('recovery');
    expect(paramsFromUrl('https://x.test/auth/callback').toString()).toBe('');
  });
});
