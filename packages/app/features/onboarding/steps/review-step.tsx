'use client';

import { effectiveModules, type StepId, tracksCycle } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Activity,
  Button,
  CalendarDays,
  CalendarHeart,
  CookingPot,
  Droplet,
  Droplets,
  EyeOff,
  HeartPulse,
  Icon,
  type IconComponent,
  LayoutGrid,
  Pencil,
  Ruler,
  Target,
  Text,
  User,
  Weight,
} from '@aurora/ui';
import { format, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { StepHeading } from '../components/layout';
import type { StepDefinition, StepProps } from './types';

type Row = { step: StepId; icon: IconComponent; label: string; value: string | undefined };

const KG_PER_LB = 0.45359237;

/**
 * Target Calibration: no new question. Shows the baseline answers grouped, each with an edit
 * button, then "Lock In My Baseline". Targets themselves are worked out by the backend.
 */
export const calibrationStep: StepDefinition = {
  Body: function CalibrationBody({ draft, goTo }: StepProps) {
    const { t } = useTranslation();
    const cycle = tracksCycle(draft);

    const height = (() => {
      if (draft.heightCm === undefined) return undefined;
      if (draft.heightUnit !== 'ftin') {
        return t('onboarding.height.cmValue', { value: Math.round(draft.heightCm) });
      }
      const inches = Math.round(draft.heightCm / 2.54);
      return t('onboarding.height.ftinValue', {
        feet: Math.floor(inches / 12),
        inches: inches % 12,
      });
    })();
    const weight =
      draft.weightKg === undefined
        ? undefined
        : draft.weightUnit === 'lb'
          ? t('onboarding.weight.lbValue', { value: Math.round(draft.weightKg / KG_PER_LB) })
          : t('onboarding.weight.kgValue', { value: Math.round(draft.weightKg) });

    const groups: { title: string; rows: Row[] }[] = [
      {
        title: t('onboarding.review.groupGoals'),
        rows: [
          {
            step: 'goal',
            icon: Target,
            label: t('onboarding.review.goal'),
            value: draft.goal && t(`onboarding.options.goal.${draft.goal}`),
          },
          {
            step: 'cookingStyle',
            icon: CookingPot,
            label: t('onboarding.review.cookingStyle'),
            value: draft.cookingStyle && t(`onboarding.options.cookingStyle.${draft.cookingStyle}`),
          },
          {
            step: 'oil',
            icon: Droplet,
            label: t('onboarding.review.oil'),
            value: draft.oil && t(`onboarding.options.oil.${draft.oil}`),
          },
        ],
      },
      {
        title: t('onboarding.review.groupYou'),
        rows: [
          {
            step: 'sex',
            icon: User,
            label: t('onboarding.review.sex'),
            value: draft.sex && t(`onboarding.options.sex.${draft.sex}`),
          },
          {
            step: draft.sex === 'male' ? 'sex' : 'features',
            icon: LayoutGrid,
            label: t('onboarding.review.features'),
            value: effectiveModules(draft)
              .map((m) =>
                m === 'food' ? t('onboarding.features.food') : t('onboarding.features.cycle'),
              )
              .join(' · '),
          },
          ...(cycle
            ? ([
                {
                  step: 'lastPeriod',
                  icon: CalendarDays,
                  label: t('onboarding.review.lastPeriod'),
                  value: draft.lastPeriodUnknown
                    ? t('onboarding.lastPeriod.dontRecall')
                    : draft.lastPeriodStart &&
                      format(parseISO(draft.lastPeriodStart), 'd MMMM yyyy'),
                },
                {
                  step: 'cycleLength',
                  icon: CalendarHeart,
                  label: t('onboarding.review.cycleLength'),
                  value: t('onboarding.cycleLength.value', { count: draft.cycleLengthDays }),
                },
                {
                  step: 'discreetMode',
                  icon: EyeOff,
                  label: t('onboarding.review.discreetMode'),
                  value: draft.discreetMode
                    ? t('onboarding.review.on')
                    : t('onboarding.review.off'),
                },
              ] satisfies Row[])
            : []),
        ],
      },
      {
        title: t('onboarding.review.groupBody'),
        rows: [
          {
            step: 'bodyType',
            icon: User,
            label: t('onboarding.review.bodyType'),
            value: draft.bodyType && t(`onboarding.options.bodyType.${draft.bodyType}`),
          },
          { step: 'height', icon: Ruler, label: t('onboarding.review.height'), value: height },
          { step: 'weight', icon: Weight, label: t('onboarding.review.weight'), value: weight },
          {
            step: 'activity',
            icon: Activity,
            label: t('onboarding.review.activity'),
            value: draft.activityLevel && t(`onboarding.options.activity.${draft.activityLevel}`),
          },
          {
            step: 'health',
            icon: HeartPulse,
            label: t('onboarding.review.bloodPressure'),
            value:
              draft.bloodPressure && t(`onboarding.options.bloodPressure.${draft.bloodPressure}`),
          },
          {
            step: 'health',
            icon: Droplets,
            label: t('onboarding.review.diabetes'),
            value:
              draft.hasDiabetes === undefined
                ? undefined
                : draft.hasDiabetes
                  ? t('onboarding.health.yes')
                  : t('onboarding.health.no'),
          },
        ],
      },
    ];

    return (
      <>
        <StepHeading
          title={t('onboarding.review.title')}
          subtitle={t('onboarding.review.subtitle')}
        />
        {groups.map((group) => (
          <View key={group.title} className="gap-2.5">
            <Text className="text-muted-foreground text-sm font-semibold">{group.title}</Text>
            <View className="bg-card border-border overflow-hidden rounded-2xl border shadow-sm shadow-black/5">
              {group.rows.map((row, index) => (
                <Pressable
                  key={row.label}
                  role="button"
                  aria-label={t('onboarding.review.editLabel', { field: row.label })}
                  onPress={() => goTo(row.step)}
                  className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${index > 0 ? 'border-border border-t' : ''}`}
                >
                  <View className="bg-muted h-9 w-9 items-center justify-center rounded-lg">
                    <Icon as={row.icon} size={18} className="text-muted-foreground" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-muted-foreground text-xs">{row.label}</Text>
                    <Text className="text-base font-medium">{row.value ?? '—'}</Text>
                  </View>
                  <Icon as={Pencil} size={16} className="text-muted-foreground" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </>
    );
  },
  Footer: function CalibrationFooter({ next }) {
    const { t } = useTranslation();
    return (
      <Button size="lg" onPress={next}>
        <Text>{t('onboarding.review.lockIn')}</Text>
      </Button>
    );
  },
};
