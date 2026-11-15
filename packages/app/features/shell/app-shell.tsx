'use client';

import { View } from 'react-native';
import { usePathname } from '../../lib/navigation';
import { CycleSettingsSheet } from '../cycle/components/settings-sheet';
import { ProfileSheet } from './profile-sheet';
import { QuickLogSheet } from './quick-log-sheet';
import { AppTabBar } from './tab-bar';
import { AppTopBar, isStandalone } from './top-bar';

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
 * Web layout for signed-in sections: top bar, content, bottom tab bar. The same phone layout at
 * every screen size; on a computer the root layout centres it in a phone-width frame.
 * (Native gets the same tab bar through Expo Router's Tabs; see apps/mobile/app/(tabs)/_layout.tsx.)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pushed = isStandalone(pathname);
  return (
    <View className="bg-background h-dvh">
      {pushed ? null : <AppTopBar />}
      <View className="flex-1">{children}</View>
      {pushed ? null : <AppTabBar />}
      <ShellOverlays />
    </View>
  );
}
