import { useTranslation } from '@aurora/i18n';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AppSplash } from '../../components/app-splash';

// Native: applies OTA updates (EAS Update) as soon as they're found, instead of on the next cold
// start. Checks on launch and whenever the app returns to the foreground; when an update exists it
// covers the app with a "downloading" screen, downloads it and restarts into it. Web twin:
// update-overlay.tsx (no-op; the web app is redeployed instead).

/** Give up and carry on with the current version if a download takes longer than this. */
const DOWNLOAD_TIMEOUT_MS = 30_000;

type Phase = 'idle' | 'downloading' | 'restarting';

export function UpdateOverlay() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const running = useRef(false);

  useEffect(() => {
    // Disabled in development (Metro serves the JS) and in builds without expo-updates configured.
    if (!Updates.isEnabled || __DEV__) return;

    async function checkAndApply() {
      if (running.current) return;
      running.current = true;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;

        setPhase('downloading');
        const fetched = await Promise.race([
          Updates.fetchUpdateAsync(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), DOWNLOAD_TIMEOUT_MS)),
        ]);
        if (!fetched?.isNew) {
          setPhase('idle');
          return;
        }

        setPhase('restarting');
        await Updates.reloadAsync();
      } catch {
        // Offline, server hiccup, etc. The current version keeps working; we'll try again on the
        // next launch or foreground.
        setPhase('idle');
      } finally {
        running.current = false;
      }
    }

    void checkAndApply();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkAndApply();
    });
    return () => subscription.remove();
  }, []);

  if (phase === 'idle') return null;

  return (
    <AppSplash
      className="absolute inset-0 z-50"
      message={t(phase === 'downloading' ? 'updates.downloading' : 'updates.restarting')}
    />
  );
}
