'use client';

import {
  type AuthErrorKind,
  authErrorKindFromParams,
  createSessionFromParams,
  paramsFromUrl,
  safeNextPath,
  toAuthErrorKind,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AppSplash } from '../../components/app-splash';
import { useAppRouter } from '../../lib/navigation';
import { useCallbackUrl } from './callback-url';
import { useAuthStore } from './session';

const loginWithError = (kind: AuthErrorKind) =>
  `/login?error=${kind === 'notApproved' ? 'not_approved' : 'link_expired'}`;

/**
 * Landing page for Google (web) and every auth email link (confirm sign-up, reset password).
 * Turns the link into a session, then moves on to `next` or home; failures go back to login with a
 * clear reason. On web supabase-js reads the tokens itself; on native we hand them over.
 */
export function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const url = useCallbackUrl();
  const status = useAuthStore((s) => s.status);
  const [linkHandled, setLinkHandled] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const params = paramsFromUrl(url);
    setNext(safeNextPath(params.get('next')));

    const errorKind = authErrorKindFromParams(params);
    if (errorKind) {
      router.replace(loginWithError(errorKind));
      return;
    }
    if (Platform.OS === 'web') {
      setLinkHandled(true);
      return;
    }
    createSessionFromParams(params)
      .then(() => setLinkHandled(true))
      .catch((error: unknown) => router.replace(loginWithError(toAuthErrorKind(error))));
  }, [url, router]);

  useEffect(() => {
    if (!linkHandled || status === 'loading') return;
    // No session after handling the link: it was expired, already used, or malformed.
    router.replace(status === 'signedIn' ? (next ?? '/') : loginWithError('linkExpired'));
  }, [linkHandled, status, next, router]);

  return <AppSplash message={t('auth.callback.signingIn')} />;
}
