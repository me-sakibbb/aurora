'use client';

import { AppShell } from '@mybela/app/features/shell/app-shell';

// Signed-in sections share the shell (sidebar on wide screens, bottom tab bar below `lg`).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
