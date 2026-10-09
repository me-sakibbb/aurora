'use client';

import {
  COOKING_STYLES,
  type CookingStyle,
  DIETARY_PATTERNS,
  type DietaryPattern,
  GOALS,
  type Goal,
  HEARD_FROM,
  type HeardFrom,
  OIL_LEVELS,
  toggleGoal,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Beef,
  CalendarDays,
  Camera,
  CookingPot,
  Ellipsis,
  Flower2,
  type IconComponent,
  Leaf,
  Music2,
  PiggyBank,
  Salad,
  Store,
  Text,
  ThumbsUp,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  Zap,
} from '@aurora/ui';
import { View } from 'react-native';
import { Choices, SingleChoice } from '../components/choices';
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
  weight_loss: TrendingDown,
  weight_gain: TrendingUp,
  hormonal: Flower2,
  mindful: Salad,
  energy: Zap,
};

const DIET_ICONS: Record<DietaryPattern, IconComponent> = {
  omnivore: Utensils,
  vegetarian: Leaf,
  no_beef: Beef,
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
  Body: function GoalBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.goal.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.goal.subtitle')} />
        <Choices
          label={title}
          multiple
          selected={draft.goals}
          onToggle={(goal) => update({ goals: toggleGoal(draft.goals, goal) })}
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

export const dietStep: StepDefinition = {
  auto: true,
  Body: function DietBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.diet.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.diet.subtitle')} />
        <SingleChoice
          label={title}
          value={draft.dietaryPattern}
          onChange={(dietaryPattern) => {
            update({ dietaryPattern });
            autoAdvance();
          }}
          choices={DIETARY_PATTERNS.map((value) => ({
            value,
            label: t(`onboarding.options.diet.${value}`),
            description: t(`onboarding.options.dietHint.${value}`),
            icon: DIET_ICONS[value],
          }))}
        />
      </>
    );
  },
};

/** Cooking style and oil on one screen; moves on once both are answered. */
export const kitchenStep: StepDefinition = {
  auto: true,
  Body: function KitchenBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const styleLabel = t('onboarding.kitchen.cookingStyle');
    const oilLabel = t('onboarding.kitchen.oil');
    return (
      <>
        <StepHeading
          title={t('onboarding.kitchen.title')}
          subtitle={t('onboarding.kitchen.subtitle')}
        />
        <View className="gap-3">
          <Text className="text-base font-semibold">{styleLabel}</Text>
          <SingleChoice
            label={styleLabel}
            layout="grid"
            value={draft.cookingStyle}
            onChange={(cookingStyle) => {
              update({ cookingStyle });
              if (draft.oil !== undefined) autoAdvance();
            }}
            choices={COOKING_STYLES.map((value) => ({
              value,
              label: t(`onboarding.options.cookingStyle.${value}`),
              description: t(`onboarding.options.cookingStyleHint.${value}`),
              icon: COOKING_ICONS[value],
            }))}
          />
        </View>
        <View className="gap-3">
          <Text className="text-base font-semibold">{oilLabel}</Text>
          <SingleChoice
            label={oilLabel}
            value={draft.oil}
            onChange={(oil) => {
              update({ oil });
              if (draft.cookingStyle !== undefined) autoAdvance();
            }}
            choices={OIL_LEVELS.map((value, i) => ({
              value,
              label: t(`onboarding.options.oil.${value}`),
              description: t(`onboarding.options.oilHint.${value}`),
              visual: (selected) => <OilDrops count={(i + 1) as 1 | 2 | 3} selected={selected} />,
            }))}
          />
        </View>
      </>
    );
  },
};
