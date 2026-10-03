'use client';

import {
  COOKING_STYLES,
  type CookingStyle,
  GOALS,
  type Goal,
  HEARD_FROM,
  type HeardFrom,
  OIL_LEVELS,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  CalendarDays,
  Camera,
  CookingPot,
  Ellipsis,
  Flower2,
  type IconComponent,
  Music2,
  PiggyBank,
  Salad,
  Store,
  ThumbsUp,
  Timer,
  Users,
  Weight,
  Zap,
} from '@aurora/ui';
import { SingleChoice } from '../components/choices';
import { StepHeading } from '../components/layout';
import { OilDrops } from '../components/visuals';
import type { StepDefinition } from './types';

// Generic icons on purpose: no third-party brand logos.
const HEARD_FROM_ICONS: Record<HeardFrom, IconComponent> = {
  app_store: Store,
  instagram: Camera,
  tiktok: Music2,
  friend: Users,
  facebook: ThumbsUp,
  other: Ellipsis,
};

const GOAL_ICONS: Record<Goal, IconComponent> = {
  weight: Weight,
  hormonal: Flower2,
  mindful: Salad,
  energy: Zap,
};

const COOKING_ICONS: Record<CookingStyle, IconComponent> = {
  quick: Timer,
  traditional: CookingPot,
  meal_prep: CalendarDays,
  budget: PiggyBank,
};

export const heardFromStep: StepDefinition = {
  auto: true,
  skippable: true,
  Body: function HeardFromBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.heardFrom.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.heardFrom.subtitle')} />
        <SingleChoice
          label={title}
          layout="grid"
          value={draft.heardFrom}
          onChange={(heardFrom) => {
            update({ heardFrom });
            autoAdvance();
          }}
          choices={HEARD_FROM.map((value) => ({
            value,
            label: t(`onboarding.options.heardFrom.${value}`),
            icon: HEARD_FROM_ICONS[value],
          }))}
        />
      </>
    );
  },
};

export const goalStep: StepDefinition = {
  auto: true,
  Body: function GoalBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.goal.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.goal.subtitle')} />
        <SingleChoice
          label={title}
          value={draft.goal}
          onChange={(goal) => {
            update({ goal });
            autoAdvance();
          }}
          choices={GOALS.map((value) => ({
            value,
            label: t(`onboarding.options.goal.${value}`),
            description: t(`onboarding.options.goalHint.${value}`),
            icon: GOAL_ICONS[value],
          }))}
        />
      </>
    );
  },
};

export const cookingStyleStep: StepDefinition = {
  auto: true,
  Body: function CookingStyleBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.cookingStyle.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.cookingStyle.subtitle')} />
        <SingleChoice
          label={title}
          layout="grid"
          value={draft.cookingStyle}
          onChange={(cookingStyle) => {
            update({ cookingStyle });
            autoAdvance();
          }}
          choices={COOKING_STYLES.map((value) => ({
            value,
            label: t(`onboarding.options.cookingStyle.${value}`),
            description: t(`onboarding.options.cookingStyleHint.${value}`),
            icon: COOKING_ICONS[value],
          }))}
        />
      </>
    );
  },
};

export const oilStep: StepDefinition = {
  auto: true,
  Body: function OilBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.oil.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.oil.subtitle')} />
        <SingleChoice
          label={title}
          value={draft.oil}
          onChange={(oil) => {
            update({ oil });
            autoAdvance();
          }}
          choices={OIL_LEVELS.map((value, i) => ({
            value,
            label: t(`onboarding.options.oil.${value}`),
            description: t(`onboarding.options.oilHint.${value}`),
            visual: (selected) => <OilDrops count={(i + 1) as 1 | 2 | 3} selected={selected} />,
          }))}
        />
      </>
    );
  },
};
