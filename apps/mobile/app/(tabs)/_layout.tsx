import { ShellOverlays } from '@aurora/app/features/shell/app-shell';
import { AppTabBar } from '@aurora/app/features/shell/tab-bar';
import { AppTopBar } from '@aurora/app/features/shell/top-bar';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

// Signed-in sections. The fixed top bar and the tab bar are the shared ones (same as web); the tab
// bar navigates by path, so it ignores the navigator's own props.
export default function TabsLayout() {
  return (
    <View className="bg-background flex-1">
      <AppTopBar />
      <Tabs
        screenOptions={{ headerShown: false, animation: 'fade' }}
        tabBar={() => <AppTabBar />}
      />
      <ShellOverlays />
    </View>
  );
}
