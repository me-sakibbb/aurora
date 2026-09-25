'use client';

import { OPEN_ROUTES, resolveAuthRedirect } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Suspense, useEffect } from 'react';
import { Platform, View } from 'react-native';
import { AppError, AppSplash } from '../../components/app-splash';
import { useAppRouter, usePathname, useSearchParam } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { useAuthStore, useOnboardingState, useSignOut } from './session';

/**
 * Keeps every screen behind sign-in and sends people to the right place:
 * signed out → /login, new → /onboarding, returning → home (rules in `resolveAuthRedirect`).
 * While that's being worked out it shows the brand splash, so protected screens never flash.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  // Web: reading search params needs a Suspense boundary; the static HTML is the splash.
  return (
    <Suspense fallback={<AppSplash />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useAppRouter();
  const pathname = usePathname();
  const next = useSearchParam('next');
  const online = useIsOnline();
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.session?.user.id);
  const onboarding = useOnboardingState(status === 'signedIn' ? userId : undefined);
  const signOut = useSignOut();

  const target = resolveAuthRedirect({ status, pathname, onboarding: onboarding.state, next });

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  const waitingForOnboarding =
    status === 'signedIn' && onboarding.state === 'unknown' && !OPEN_ROUTES.includes(pathname);

  let overlay: React.ReactNode = null;
  if (waitingForOnboarding && onboarding.isError) {
    overlay = (
      <AppError
        message={online ? t('auth.gate.error') : t('auth.gate.offline')}
        onRetry={() => void onboarding.retry()}
        secondary={{ label: t('auth.signOut'), onPress: () => signOut.mutate() }}
      />
    );
  } else if (status === 'loading' || target !== null || waitingForOnboarding) {
    overlay = <AppSplash />;
  }

  // Web renders one or the other. Native must keep the navigator mounted (Expo Router can't
  // navigate before its root layout renders a navigator), so the overlay sits on top instead.
  if (Platform.OS === 'web') return <>{overlay ?? children}</>;
  return (
    <View className="flex-1">
      {children}
      {overlay ? <View className="absolute inset-0">{overlay}</View> : null}
    </View>
  );
}
