import type { Insight, MoodToday, RecentLog, WeekActivity } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { format, setHours, setMinutes, subDays } from 'date-fns';
import { useMemo } from 'react';

// SAMPLE DATA for Home sections whose backend endpoints don't exist yet. Nothing here is computed
// from the user's data; it's fixed content shaped like the expected API response (see
// packages/api/src/home/types.ts). Remove each piece as its endpoint ships.

const DEMO_RECIPES = {
  khichuri: { id: 'demo-khichuri', name: 'Bhuna khichuri', name_bn: 'ভুনা খিচুড়ি' },
  dal: { id: 'demo-dal', name: 'Rice, masoor dal & lau shak', name_bn: 'ভাত, মসুর ডাল ও লাউ শাক' },
};

function at(hours: number, minutes: number) {
  return setMinutes(setHours(new Date(), hours), minutes).toISOString();
}

export type HomeDemo = {
  week: WeekActivity;
  noticed: Insight;
  insights: Insight[];
  recent: RecentLog[];
  mood: MoodToday;
};

export function useDemoHome(): HomeDemo {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  // `language` is a dependency so the t() calls re-run when the language flips.
  return useMemo(() => {
    const today = new Date();
    const loggedPattern = [true, true, false, true, true, true, true];
    return {
      week: {
        days: loggedPattern.map((logged, i) => ({
          date: format(subDays(today, 6 - i), 'yyyy-MM-dd'),
          logged,
        })),
        streak_days: 4,
        flex_chips: 1,
      },
      noticed: {
        id: 'demo-noticed',
        title: t('home.demo.noticedTitle'),
        body: t('home.demo.noticedBody'),
      },
      insights: [
        { id: 'demo-i1', title: t('home.demo.insight1Title'), body: t('home.demo.insight1Body') },
        { id: 'demo-i2', title: t('home.demo.insight2Title'), body: t('home.demo.insight2Body') },
      ],
      recent: [
        {
          ...DEMO_RECIPES.dal,
          id: 'demo-log-2',
          meal_slot: 'lunch',
          logged_at: at(13, 40),
          kcal: { min: 520, max: 600 },
        },
        {
          ...DEMO_RECIPES.khichuri,
          id: 'demo-log-1',
          meal_slot: 'breakfast',
          logged_at: at(8, 15),
          kcal: { min: 460, max: 520 },
        },
      ],
      mood: { mood: null },
    };
  }, [t, language]);
}
