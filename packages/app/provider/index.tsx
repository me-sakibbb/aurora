'use client';

import '@aurora/i18n';
import { createQueryClient, persistOptions, setupAppLifecycle } from '@aurora/api';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState } from 'react';
import { AuthGate } from '../features/auth/auth-gate';
import { useAuthListener } from '../features/auth/session';
import { UpdateOverlay } from '../features/updates/update-overlay';
import { useRestoreLanguage } from '../lib/language';
import { registerMutationDefaults } from './mutations';
import { SafeArea } from './safe-area';

/** Every provider both apps need. Each app's root layout renders this once. */
export function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createQueryClient();
    registerMutationDefaults(client);
    return client;
  });

  useEffect(() => setupAppLifecycle(), []);
  useRestoreLanguage();

  return (
    <SafeArea>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        // Replay anything saved while offline (or before the app was closed).
        onSuccess={() => queryClient.resumePausedMutations()}
      >
        <AuthListener />
        <AuthGate>{children}</AuthGate>
        {/* Last, so it draws above every screen while an OTA update downloads. */}
        <UpdateOverlay />
      </PersistQueryClientProvider>
    </SafeArea>
  );
}

function AuthListener() {
  useAuthListener();
  return null;
}
