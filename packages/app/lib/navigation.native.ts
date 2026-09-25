// Native: Expo Router. Same API as navigation.ts (web).
import {
  type Href,
  router,
  usePathname as useExpoPathname,
  useGlobalSearchParams,
} from 'expo-router';

export function usePathname(): string {
  return useExpoPathname();
}

const appRouter = {
  push: (href: string) => router.push(href as Href),
  replace: (href: string) => router.replace(href as Href),
};

export function useAppRouter() {
  return appRouter;
}

export function useSearchParam(name: string): string | undefined {
  const value = useGlobalSearchParams()[name];
  return Array.isArray(value) ? value[0] : value;
}
