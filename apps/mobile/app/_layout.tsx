import '../global.css';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-sans-bengali';
import * as Clarity from '@microsoft/react-native-clarity';
import { Provider } from '@mybela/app/provider';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

void SplashScreen.preventAutoHideAsync();

// Usage analytics (F14). The backend team owns the Clarity project; we only initialize it.
const clarityProjectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
const clarityOn = Boolean(clarityProjectId) && !__DEV__;
if (clarityOn && clarityProjectId) {
  Clarity.initialize(clarityProjectId);
}

/**
 * An RN app is one Android activity, so without this every session in Clarity is a single
 * "screen". Naming each route (`/food`, `/mood/check-in`…) gives the backend team per-screen time,
 * heatmaps and drop-off funnels, like the web build gets from its URLs.
 */
function ClarityScreenNames() {
  const pathname = usePathname();
  useEffect(() => {
    if (clarityOn) void Clarity.setCurrentScreenName(pathname || '/').catch(() => {});
  }, [pathname]);
  return null;
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
      <ClarityScreenNames />
      <Stack screenOptions={{ headerShown: false }}>
        {/* The check-in is a focused flow: it rises over whatever opened it. */}
        <Stack.Screen name="mood/check-in" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </Provider>
  );
}
