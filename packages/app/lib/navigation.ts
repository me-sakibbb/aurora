'use client';

// Web: Next.js App Router. The native twin (navigation.native.ts) wraps Expo Router with the same API.
// Solito's hooks aren't used here because on native they only work inside a screen, and the auth
// gate runs in the root layout.
import { usePathname as useNextPathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export function usePathname(): string {
  return useNextPathname() ?? '/';
}

export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: string) => router.push(href),
      replace: (href: string) => router.replace(href),
    }),
    [router],
  );
}

/** Must render under a <Suspense> boundary on web (the auth gate provides one for every screen). */
export function useSearchParam(name: string): string | undefined {
  return useSearchParams()?.get(name) ?? undefined;
}
