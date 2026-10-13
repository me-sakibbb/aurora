import { ShellOverlays } from '@aurora/app/features/shell/app-shell';
import { AppTabBar } from '@aurora/app/features/shell/tab-bar';
import { Tabs } from 'expo-router';

// Signed-in sections. The tab bar is the shared one (same as web below `lg`); it navigates by
// path, so it ignores the navigator's own props.
export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, animation: 'fade' }}
        tabBar={() => <AppTabBar />}
      />
      <ShellOverlays />
    </>
  );
}
