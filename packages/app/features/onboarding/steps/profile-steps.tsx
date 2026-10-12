'use client';

import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  BLOOD_PRESSURES,
  type BloodPressure,
  BODY_TYPES,
  birthYearRange,
  HEIGHT_CM,
  type HeightUnit,
  type OnboardingDraft,
  SEXES,
  type Sex,
  WEIGHT_KG,
  type WeightUnit,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Armchair,
  ArrowDown,
  ArrowUp,
  Bike,
  CircleHelp,
  Dumbbell,
  Footprints,
  HeartPulse,
  type IconComponent,
  Mars,
  NonBinary,
  Text,
  Venus,
} from '@aurora/ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ModeSwitch } from '../../auth/components/mode-switch';
import { SingleChoice } from '../components/choices';
import { StepHeading } from '../components/layout';
import { ValueSlider } from '../components/slider';
import { BodyFigure } from '../components/visuals';
import { YearWheel } from '../components/year-wheel';
import type { StepDefinition } from './types';

const SEX_ICONS: Record<Sex, IconComponent> = { female: Venus, male: Mars, other: NonBinary };

const ACTIVITY_ICONS: Record<ActivityLevel, IconComponent> = {
  mostly_sitting: Armchair,
  lightly_active: Footprints,
  moderately_active: Bike,
  very_active: Dumbbell,
};

const BLOOD_PRESSURE_ICONS: Record<BloodPressure, IconComponent> = {
  normal: HeartPulse,
  high: ArrowUp,
  low: ArrowDown,
  unknown: CircleHelp,
};

export const sexStep: StepDefinition = {
  auto: true,
  Body: function SexBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.sex.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.sex.subtitle')} />
        <SingleChoice
          label={title}
          value={draft.sex}
          onChange={(sex) => {
            update({ sex });
            autoAdvance();
          }}
          choices={SEXES.map((value) => ({
            value,
            label: t(`onboarding.options.sex.${value}`),
            icon: SEX_ICONS[value],
          }))}
        />
      </>
    );
  },
};

export const bodyTypeStep: StepDefinition = {
  auto: true,
  Body: function BodyTypeBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.bodyType.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.bodyType.subtitle')} />
        <SingleChoice
          label={title}
          layout="grid"
          value={draft.bodyType}
          onChange={(bodyType) => {
            update({ bodyType });
            autoAdvance();
          }}
          choices={BODY_TYPES.map((value) => ({
            value,
            label: t(`onboarding.options.bodyType.${value}`),
            visual: (selected) => <BodyFigure type={value} selected={selected} />,
          }))}
        />
      </>
    );
  },
};

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;
const round1 = (n: number) => Math.round(n * 10) / 10;

export const birthYearStep: StepDefinition = {
  Body: function BirthYearBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.birthYear.title');
    const years = birthYearRange();

    // The wheel starts on a year, so record it as the answer until another one is picked.
    useEffect(() => {
      if (draft.birthYear === undefined) update({ birthYear: years.default });
    }, [draft.birthYear, years.default, update]);

    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.birthYear.subtitle')} />
        <YearWheel
          label={title}
          value={draft.birthYear ?? years.default}
          min={years.min}
          max={years.max}
          onChange={(birthYear) => update({ birthYear })}
        />
      </>
    );
  },
};

/** Height and weight on one screen. */
export const measurementsStep: StepDefinition = {
  Body: function MeasurementsBody({ draft, update }) {
    const { t } = useTranslation();

    // The sliders show starting values, so record them as answers until they're moved.
    useEffect(() => {
      const defaults: Partial<OnboardingDraft> = {};
      if (draft.heightCm === undefined) defaults.heightCm = HEIGHT_CM.default;
      if (draft.weightKg === undefined) defaults.weightKg = WEIGHT_KG.default;
      if (Object.keys(defaults).length > 0) update(defaults);
    }, [draft.heightCm, draft.weightKg, update]);

    const heightLabel = t('onboarding.measurements.height');
    const weightLabel = t('onboarding.measurements.weight');
    const cm = draft.heightCm ?? HEIGHT_CM.default;
    const kg = draft.weightKg ?? WEIGHT_KG.default;
    return (
      <>
        <StepHeading
          title={t('onboarding.measurements.title')}
          subtitle={t('onboarding.measurements.subtitle')}
        />
        <Section
          label={heightLabel}
          units={
            <ModeSwitch<HeightUnit>
              value={draft.heightUnit}
              onChange={(heightUnit) => update({ heightUnit })}
              options={[
                { value: 'cm', label: t('onboarding.units.cm') },
                { value: 'ftin', label: t('onboarding.units.ftin') },
              ]}
            />
          }
        >
          {draft.heightUnit === 'ftin' ? (
            <ValueSlider
              size="sm"
              label={heightLabel}
              value={Math.round(cm / CM_PER_INCH)}
              min={Math.ceil(HEIGHT_CM.min / CM_PER_INCH)}
              max={Math.floor(HEIGHT_CM.max / CM_PER_INCH)}
              onChange={(value) => update({ heightCm: round1(value * CM_PER_INCH) })}
              format={(value) =>
                t('onboarding.height.ftinValue', {
                  feet: Math.floor(value / 12),
                  inches: value % 12,
                })
              }
            />
          ) : (
            <ValueSlider
              size="sm"
              label={heightLabel}
              value={Math.round(cm)}
              min={HEIGHT_CM.min}
              max={HEIGHT_CM.max}
              onChange={(heightCm) => update({ heightCm })}
              format={(value) => t('onboarding.height.cmValue', { value })}
            />
          )}
        </Section>
        <Section
          label={weightLabel}
          units={
            <ModeSwitch<WeightUnit>
              value={draft.weightUnit}
              onChange={(weightUnit) => update({ weightUnit })}
              options={[
                { value: 'kg', label: t('onboarding.units.kg') },
                { value: 'lb', label: t('onboarding.units.lb') },
              ]}
            />
          }
        >
          {draft.weightUnit === 'lb' ? (
            <ValueSlider
              size="sm"
              label={weightLabel}
              value={Math.round(kg / KG_PER_LB)}
              min={Math.ceil(WEIGHT_KG.min / KG_PER_LB)}
              max={Math.floor(WEIGHT_KG.max / KG_PER_LB)}
              onChange={(lb) => update({ weightKg: round1(lb * KG_PER_LB) })}
              format={(value) => t('onboarding.weight.lbValue', { value })}
            />
          ) : (
            <ValueSlider
              size="sm"
              label={weightLabel}
              value={Math.round(kg)}
              min={WEIGHT_KG.min}
              max={WEIGHT_KG.max}
              onChange={(weightKg) => update({ weightKg })}
              format={(value) => t('onboarding.weight.kgValue', { value })}
            />
          )}
        </Section>
      </>
    );
  },
};

/** One measurement on the height & weight screen: a label (with an optional unit switch) above it. */
function Section({
  label,
  units,
  children,
}: {
  label: string;
  units?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-card border-border gap-3 rounded-2xl border p-4 shadow-sm shadow-black/5">
      <View className="min-h-10 flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold">{label}</Text>
        {units ? <View className="w-40">{units}</View> : null}
      </View>
      {children}
    </View>
  );
}

export const activityStep: StepDefinition = {
  auto: true,
  Body: function ActivityBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const title = t('onboarding.activity.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.activity.subtitle')} />
        <SingleChoice
          label={title}
          value={draft.activityLevel}
          onChange={(activityLevel) => {
            update({ activityLevel });
            autoAdvance();
          }}
          choices={ACTIVITY_LEVELS.map((value) => ({
            value,
            label: t(`onboarding.options.activity.${value}`),
            description: t(`onboarding.options.activityHint.${value}`),
            icon: ACTIVITY_ICONS[value],
          }))}
        />
      </>
    );
  },
};

type YesNo = 'yes' | 'no';

export const healthStep: StepDefinition = {
  auto: true,
  Body: function HealthBody({ draft, update, autoAdvance }) {
    const { t } = useTranslation();
    const bpLabel = t('onboarding.health.bloodPressure');
    const diabetesLabel = t('onboarding.health.diabetes');
    const diabetes: YesNo | undefined =
      draft.hasDiabetes === undefined ? undefined : draft.hasDiabetes ? 'yes' : 'no';
    return (
      <>
        <StepHeading
          title={t('onboarding.health.title')}
          subtitle={t('onboarding.health.subtitle')}
        />
        <View className="gap-3">
          <Text className="text-base font-semibold">{bpLabel}</Text>
          <SingleChoice
            label={bpLabel}
            layout="grid"
            value={draft.bloodPressure}
            onChange={(bloodPressure) => {
              update({ bloodPressure });
              // Move on once both questions on this step are answered.
              if (draft.hasDiabetes !== undefined) autoAdvance();
            }}
            choices={BLOOD_PRESSURES.map((value) => ({
              value,
              label: t(`onboarding.options.bloodPressure.${value}`),
              icon: BLOOD_PRESSURE_ICONS[value],
            }))}
          />
        </View>
        <View className="gap-3">
          <Text className="text-base font-semibold">{diabetesLabel}</Text>
          <SingleChoice<YesNo>
            label={diabetesLabel}
            layout="grid"
            value={diabetes}
            onChange={(value) => {
              update({ hasDiabetes: value === 'yes' });
              if (draft.bloodPressure !== undefined) autoAdvance();
            }}
            choices={[
              { value: 'yes', label: t('onboarding.health.yes') },
              { value: 'no', label: t('onboarding.health.no') },
            ]}
          />
        </View>
      </>
    );
  },
};
