'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, ChevronLeft, Icon, SlidersHorizontal, Text } from '@aurora/ui';
import { View } from 'react-native';
import { useInsets } from '../../lib/insets';
import { useAppRouter, usePathname } from '../../lib/navigation';
import { useCycleAccess } from '../cycle/queries';
import { isActivePath } from './nav';
import { ProfileButton } from './profile-button';
import { useSheets } from './sheets';

/** Pushed screens with a back button; they draw their own bar instead of the shell's. */
export const STANDALONE_PATHS = ['/mood'];

const TITLES = [
  { href: '/food', key: 'shell.nav.food' },
  { href: '/chat', key: 'shell.nav.chat' },
  { href: '/cycle', key: 'shell.nav.cycle' },
  { href: '/insights', key: 'shell.nav.insights' },
  { href: '/mood', key: 'placeholders.mood.title' },
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
      <View className="mx-auto h-14 w-full max-w-6xl flex-row items-center gap-2 px-5 lg:px-10">
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
    </View>
  );
}
