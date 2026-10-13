'use client';

import { View } from 'react-native';
import { ProfileSheet } from './profile-sheet';
import { QuickLogSheet } from './quick-log-sheet';
import { SideNav } from './side-nav';
import { AppTabBar } from './tab-bar';

/** The app-wide sheets. Rendered once, by the shell (web) or the tabs layout (native). */
export function ShellOverlays() {
  return (
    <>
      <QuickLogSheet />
      <ProfileSheet />
    </>
  );
}

/**
 * Web layout for signed-in sections: sidebar on wide screens, bottom tab bar below `lg`.
 * (Native gets the same tab bar through Expo Router's Tabs; see apps/mobile/app/(tabs)/_layout.tsx.)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-background h-dvh flex-row">
      <SideNav className="hidden lg:flex" />
      <View className="min-w-0 flex-1">
        <View className="flex-1">{children}</View>
        <AppTabBar className="lg:hidden" />
      </View>
      <ShellOverlays />
    </View>
  );
}
