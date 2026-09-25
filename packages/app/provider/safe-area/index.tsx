// Web: no safe-area provider needed; use CSS env(safe-area-inset-*) where it matters.
export function SafeArea({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
