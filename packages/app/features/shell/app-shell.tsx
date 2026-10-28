'use client';

import { View } from 'react-native';
import { usePathname } from '../../lib/navigation';
import { CycleSettingsSheet } from '../cycle/components/settings-sheet';
import { ProfileSheet } from './profile-sheet';
import { QuickLogSheet } from './quick-log-sheet';
import { SideNav } from './side-nav';
import { AppTabBar } from './tab-bar';
import { AppTopBar, STANDALONE_PATHS } from './top-bar';

/** The app-wide sheets. Rendered once, by the shell (web) or the tabs layout (native). */
export function ShellOverlays() {
  return (
    <>
      <QuickLogSheet />
      <ProfileSheet />
      <CycleSettingsSheet />
    </>
  );
}

/**
 * Web layout for signed-in sections: sidebar on wide screens, bottom tab bar below `lg`.
 * (Native gets the same tab bar through Expo Router's Tabs; see apps/mobile/app/(tabs)/_layout.tsx.)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <View className="bg-background h-dvh flex-row">
      <SideNav className="hidden lg:flex" />
      <View className="min-w-0 flex-1">
        {STANDALONE_PATHS.includes(pathname) ? null : <AppTopBar />}
        <View className="flex-1">{children}</View>
        <AppTabBar className="lg:hidden" />
      </View>
      <ShellOverlays />
    </View>
  );
}
