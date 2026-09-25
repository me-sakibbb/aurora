import '../global.css';
import { Provider } from '@aurora/app/provider';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-sans-bengali';
import * as Clarity from '@microsoft/react-native-clarity';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

void SplashScreen.preventAutoHideAsync();

// Usage analytics (F14). The backend team owns the Clarity project; we only initialize it.
const clarityProjectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
if (clarityProjectId && !__DEV__) {
  Clarity.initialize(clarityProjectId);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Provider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
