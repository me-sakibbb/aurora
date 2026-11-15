'use client';

import { useTranslation } from '@mybela/i18n';
import { Button, ChevronLeft, Icon, SlidersHorizontal, Text } from '@mybela/ui';
import { View } from 'react-native';
import { useInsets } from '../../lib/insets';
import { useAppRouter, usePathname } from '../../lib/navigation';
import { useCycleAccess } from '../cycle/queries';
import { ConnectionStatus } from './connection-status';
import { isActivePath } from './nav';
import { ProfileButton } from './profile-button';
import { useSheets } from './sheets';

/**
 * Pushed screens (and everything under them): they draw their own bar (with back) and, like on
 * Android where they open over the tabs, show no tab bar.
 */
export const STANDALONE_PATHS = ['/mood'];

export const isStandalone = (pathname: string) =>
  STANDALONE_PATHS.some((href) => isActivePath(pathname, href));

const TITLES = [
  { href: '/food', key: 'shell.nav.food' },
  { href: '/chat', key: 'shell.nav.chat' },
  { href: '/cycle', key: 'shell.nav.cycle' },
  { href: '/insights', key: 'shell.nav.insights' },
  { href: '/mood', key: 'mood.title' },
] as const;

/**
 * The app's fixed top bar, the same on every signed-in screen: the section's title, its actions,
 * and the profile avatar always in the same spot. Content scrolls underneath. Drawn once by the
 * shell (web layout, native tabs layout); standalone screens render it themselves with `back`.
 */
export function AppTopBar({ back = false }: { back?: boolean }) {
  const { t } = useTranslation();
  const insets = useInsets();
  const router = useAppRouter();
  const pathname = usePathname();
  const showSheet = useSheets((s) => s.show);
  const cycle = useCycleAccess();

  const match = TITLES.find((item) => isActivePath(pathname, item.href));
  const title = match ? t(match.key) : t('common.appName');
  const onCycle = isActivePath(pathname, '/cycle');

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background border-border border-b">
      <View className="mx-auto h-14 w-full max-w-6xl flex-row items-center gap-2 px-5">
        {back ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 rounded-full"
            aria-label={t('onboarding.back')}
            onPress={router.back}
          >
            <Icon as={ChevronLeft} size={24} />
          </Button>
        ) : null}
        <Text
          role="heading"
          aria-level={1}
          numberOfLines={1}
          className="flex-1 text-xl font-semibold tracking-tight"
        >
          {title}
        </Text>
        {onCycle && cycle === 'enabled' ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t('cycle.settings.title')}
            onPress={() => showSheet('cycleSettings')}
          >
            <Icon as={SlidersHorizontal} size={20} />
          </Button>
        ) : null}
        <ProfileButton />
      </View>
      <ConnectionStatus />
    </View>
  );
}
