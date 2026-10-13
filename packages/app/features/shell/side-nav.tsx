'use client';

import { useTranslation } from '@aurora/i18n';
import { cn, Icon, Plus, Text } from '@aurora/ui';
import { Pressable, View } from 'react-native';
import { BrandMark } from '../../components/brand-mark';
import { useAppRouter, usePathname } from '../../lib/navigation';
import { Avatar, useAccount } from './account';
import { isActivePath, useNavItems } from './nav';
import { useSheets } from './sheets';

/** Wide-screen (web `lg+`) navigation rail: brand, sections, Log button, account. */
export function SideNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useAppRouter();
  const { all } = useNavItems();
  const showSheet = useSheets((s) => s.show);
  const { fullName, email } = useAccount();

  return (
    <View
      role="navigation"
      aria-label={t('shell.navLabel')}
      className={cn('bg-card border-border w-64 border-r px-4 pb-4 pt-6', className)}
    >
      <View className="mb-8 flex-row items-center gap-3 px-2">
        <BrandMark />
        <Text className="text-xl font-bold tracking-tight">{t('common.appName')}</Text>
      </View>

      <View className="gap-1">
        {all.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Pressable
              key={item.key}
              role="link"
              aria-current={active ? 'page' : undefined}
              onPress={() => !active && router.navigate(item.href)}
              className={cn(
                'flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                active ? 'bg-sage/15' : 'hover:bg-muted',
              )}
            >
              <Icon
                as={item.icon}
                size={20}
                strokeWidth={active ? 2.4 : 2}
                className={active ? 'text-primary' : 'text-muted-foreground'}
              />
              <Text
                className={cn(
                  'text-[15px]',
                  active ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium',
                )}
              >
                {t(`shell.nav.${item.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => showSheet('quickLog')}
        className="bg-primary mt-6 h-12 flex-row items-center justify-center gap-2 rounded-xl transition-opacity hover:opacity-90"
      >
        <Icon as={Plus} size={20} strokeWidth={2.5} className="text-primary-foreground" />
        <Text className="text-primary-foreground font-semibold">{t('shell.logSomething')}</Text>
      </Pressable>

      <View className="flex-1" />

      <Pressable
        onPress={() => showSheet('profile')}
        aria-label={t('shell.openProfile')}
        className="hover:bg-muted flex-row items-center gap-3 rounded-xl p-2 transition-colors"
      >
        <Avatar />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-semibold">
            {fullName || t('shell.you')}
          </Text>
          <Text numberOfLines={1} className="text-muted-foreground text-xs">
            {email}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
