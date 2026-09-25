import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Native has no window events, so tell TanStack Query about connectivity and app focus,
 * and only refresh the Supabase session while the app is in the foreground.
 * Returns a cleanup function.
 */
export function setupAppLifecycle(): () => void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }),
  );

  const sub = AppState.addEventListener('change', (status) => {
    const active = status === 'active';
    focusManager.setFocused(active);
    if (isSupabaseConfigured()) {
      const auth = getSupabase().auth;
      if (active) auth.startAutoRefresh();
      else auth.stopAutoRefresh();
    }
  });

  return () => sub.remove();
}
