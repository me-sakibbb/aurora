'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { StyleSheet } from 'react-native';

/** Injects react-native-web's generated styles into the server-rendered HTML (no flash of unstyled content). */
export function StylesProvider({ children }: { children: React.ReactNode }) {
  useServerInsertedHTML(() => {
    // @ts-expect-error getSheet exists on react-native-web's StyleSheet only.
    const sheet = StyleSheet.getSheet();
    // biome-ignore lint/security/noDangerouslySetInnerHtml: react-native-web generated CSS, not user input.
    return <style dangerouslySetInnerHTML={{ __html: sheet.textContent }} id={sheet.id} />;
  });
  return <>{children}</>;
}
