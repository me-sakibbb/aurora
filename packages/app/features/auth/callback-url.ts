'use client';

import { useEffect, useState } from 'react';

/**
 * Web: the URL this page was opened with, captured on mount. That runs before the root provider
 * starts Supabase (child effects run first), so it still has the hash that supabase-js strips.
 */
export function useCallbackUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(window.location.href), []);
  return url;
}
