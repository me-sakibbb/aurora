'use client';

import '@aurora/i18n';
import { createQueryClient, persistOptions, setupAppLifecycle } from '@aurora/api';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState } from 'react';
import { AuthGate } from '../features/auth/auth-gate';
import { useAuthListener } from '../features/auth/session';
import { useRestoreLanguage } from '../lib/language';
import { SafeArea } from './safe-area';

/** Every provider both apps need. Each app's root layout renders this once. */
export function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

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
      </PersistQueryClientProvider>
    </SafeArea>
  );
}

function AuthListener() {
  useAuthListener();
  return null;
}
