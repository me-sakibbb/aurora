import type { MoodInsight } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { useMemo } from 'react';

// SAMPLE DATA for F17 Mood Pattern Insights, until the backend's `GET /mood/insights` exists
// (proposed contract: packages/api/src/mood/types.ts). Fixed wording, not derived from anyone's
// entries; shown with a "Preview" badge. Replace with a query once the endpoint ships.

/**
 * `hasEntries` only picks which sample to show, so a brand-new account sees the honest "not enough
 * yet" state rather than a made-up pattern.
 */
export function useDemoMoodInsight(hasEntries: boolean): MoodInsight {
  const { t, i18n } = useTranslation();
  // `language` is a dependency so the t() calls re-run when the language flips.
  const language = i18n.language;
  return useMemo(
    () =>
      hasEntries
        ? {
            status: 'ready',
            observation: t('mood.insight.demoObservation'),
            message: null,
            updated_at: new Date().toISOString(),
          }
        : {
            status: 'not_enough_data',
            observation: null,
            message: t('mood.insight.demoNotEnough'),
            updated_at: new Date().toISOString(),
          },
    [hasEntries, t, language],
  );
}
