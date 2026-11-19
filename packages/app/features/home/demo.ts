import type { Insight, WeekActivity } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { useMemo } from 'react';

// SAMPLE DATA for Home sections whose backend endpoints don't exist yet. Nothing here is computed
// from the user's data; it's fixed content shaped like the expected API response (see
// packages/api/src/home/types.ts). Remove each piece as its endpoint ships.

export type HomeDemo = {
  week: WeekActivity;
  noticed: Insight;
};

export function useDemoHome(): HomeDemo {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  // `language` is a dependency so the t() calls re-run when the language flips.
  return useMemo(() => {
    return {
      week: {
        streak_days: 4,
        flex_chips: 1,
      },
      noticed: {
        id: 'demo-noticed',
        title: t('home.demo.noticedTitle'),
        body: t('home.demo.noticedBody'),
      },
    };
  }, [t, language]);
}
