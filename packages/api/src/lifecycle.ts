// Web: TanStack Query already listens to window online/offline + visibility events,
// and supabase-js pauses token refresh when the tab is hidden. Nothing to wire.
export function setupAppLifecycle(): () => void {
  return () => {};
}
