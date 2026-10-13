'use client';

import { useTranslation } from '@aurora/i18n';
import { cn, Icon, Plus, Text } from '@aurora/ui';
import { Platform, Pressable, View } from 'react-native';
import { Pop } from '../../components/pop';
import { tapHaptic } from '../../lib/haptics';
import { useInsets } from '../../lib/insets';
import { useAppRouter, usePathname } from '../../lib/navigation';
import { isActivePath, type NavItem, useNavItems } from './nav';
import { useSheets } from './sheets';

/**
 * The bottom navigation: four sections around a raised Log button (opens the quick-log sheet).
 * Native: Expo Router's Tabs render it as their tab bar. Web: the shell shows it below `lg`.
 */
export function AppTabBar({ className }: { className?: string }) {
  const { t } = useTranslation();
  const insets = useInsets();
  const { bar } = useNavItems();
  const showSheet = useSheets((s) => s.show);
  const quickLogOpen = useSheets((s) => s.open === 'quickLog');

  return (
    <View
      role="navigation"
      aria-label={t('shell.navLabel')}
      className={cn('bg-card border-border border-t', className)}
      style={{ paddingBottom: Math.max(insets.bottom, 6) }}
    >
      <View className="mx-auto w-full max-w-lg flex-row items-end px-1 pt-1.5">
        {bar.left.map((item) => (
          <TabItem key={item.key} item={item} />
        ))}
        <View className="flex-1 items-center">
          <Pressable
            onPress={() => {
              tapHaptic();
              showSheet('quickLog');
            }}
            aria-label={t('shell.log')}
            aria-expanded={quickLogOpen}
            className={cn(
              'bg-primary border-card -mt-6 h-[60px] w-[60px] items-center justify-center rounded-full border-4 shadow-lg shadow-black/20 active:scale-95',
              Platform.select({ web: 'transition-transform hover:scale-105' }),
            )}
          >
            <Pop active={quickLogOpen}>
              <Icon
                as={Plus}
                size={26}
                strokeWidth={2.5}
                className={cn(
                  'text-primary-foreground',
                  Platform.select({ web: 'transition-transform duration-200' }),
                  quickLogOpen && 'rotate-45',
                )}
              />
            </Pop>
          </Pressable>
          <Text className="text-muted-foreground mt-0.5 text-[11px] font-medium" aria-hidden>
            {t('shell.log')}
          </Text>
        </View>
        {bar.right.map((item) => (
          <TabItem key={item.key} item={item} />
        ))}
      </View>
    </View>
  );
}

function TabItem({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useAppRouter();
  const active = isActivePath(pathname, item.href);

  return (
    <Pressable
      onPress={() => {
        if (active) return;
        tapHaptic();
        router.navigate(item.href);
      }}
      role="link"
      aria-current={active ? 'page' : undefined}
      aria-label={t(`shell.nav.${item.key}`)}
      className="min-h-[52px] flex-1 items-center justify-end gap-0.5 pb-0.5"
    >
      <View
        className={cn(
          'h-8 w-14 items-center justify-center rounded-full',
          active ? 'bg-sage/20' : 'bg-transparent',
        )}
      >
        <Pop active={active}>
          <Icon
            as={item.icon}
            size={22}
            strokeWidth={active ? 2.4 : 2}
            className={active ? 'text-primary' : 'text-muted-foreground'}
          />
        </Pop>
      </View>
      <Text
        numberOfLines={1}
        className={cn(
          'text-[11px]',
          active ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
        )}
      >
        {t(`shell.nav.${item.key}`)}
      </Text>
    </Pressable>
  );
}
