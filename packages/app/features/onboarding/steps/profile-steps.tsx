'use client';

import {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  type AppModule,
  BLOOD_PRESSURES,
  type BloodPressure,
  BODY_TYPES,
  CYCLE_LENGTH,
  HEIGHT_CM,
  type HeightUnit,
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
  Blend,
  CalendarHeart,
  Check,
  CircleHelp,
  cn,
  Dumbbell,
  EyeOff,
  Footprints,
  HeartPulse,
  Icon,
  type IconComponent,
  Mars,
  NonBinary,
  Text,
  Utensils,
  Venus,
} from '@aurora/ui';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { ModeSwitch } from '../../auth/components/mode-switch';
import { PastDateCalendar } from '../components/calendar';
import { Choices, SingleChoice } from '../components/choices';
import { StepHeading } from '../components/layout';
import { ValueSlider } from '../components/slider';
import { ToggleRow } from '../components/toggle-row';
import { BodyFigure, HeroIcon } from '../components/visuals';
import type { StepDefinition } from './types';

const SEX_ICONS: Record<Sex, IconComponent> = { female: Venus, male: Mars, other: NonBinary };

const ACTIVITY_ICONS: Record<ActivityLevel, IconComponent> = {
  sedentary: Armchair,
  light: Footprints,
  moderate: Bike,
  active: Dumbbell,
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

type FeatureChoice = AppModule | 'both';

export const featuresStep: StepDefinition = {
  Body: function FeaturesBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.features.title');
    const both = draft.modules.includes('food') && draft.modules.includes('cycle');
    const selected: FeatureChoice[] = both ? ['food', 'cycle', 'both'] : draft.modules;

    function toggle(choice: FeatureChoice) {
      if (choice === 'both') {
        update({ modules: both ? [] : ['food', 'cycle'] });
        return;
      }
      const modules = draft.modules.includes(choice)
        ? draft.modules.filter((m) => m !== choice)
        : [...draft.modules, choice];
      // Keep a stable order for the payload.
      update({ modules: (['food', 'cycle'] as const).filter((m) => modules.includes(m)) });
    }

    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.features.subtitle')} />
        <Choices<FeatureChoice>
          label={title}
          multiple
          selected={selected}
          onToggle={toggle}
          choices={[
            {
              value: 'food',
              label: t('onboarding.features.food'),
              description: t('onboarding.features.foodHint'),
              icon: Utensils,
            },
            {
              value: 'cycle',
              label: t('onboarding.features.cycle'),
              description: t('onboarding.features.cycleHint'),
              icon: CalendarHeart,
            },
            {
              value: 'both',
              label: t('onboarding.features.both'),
              description: t('onboarding.features.bothHint'),
              icon: Blend,
            },
          ]}
        />
      </>
    );
  },
};

export const lastPeriodStep: StepDefinition = {
  Body: function LastPeriodBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.lastPeriod.title');
    const unknown = draft.lastPeriodUnknown;
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.lastPeriod.subtitle')} />
        <View className={cn(unknown && 'opacity-40')}>
          <PastDateCalendar
            label={title}
            value={unknown ? undefined : draft.lastPeriodStart}
            onChange={(lastPeriodStart) => update({ lastPeriodStart, lastPeriodUnknown: false })}
          />
        </View>
        <Pressable
          role="checkbox"
          aria-checked={unknown}
          onPress={() => update({ lastPeriodUnknown: !unknown, lastPeriodStart: undefined })}
          className={cn(
            'bg-card flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3.5 active:opacity-90',
            unknown ? 'border-primary' : 'border-border',
          )}
        >
          <View
            aria-hidden
            className={cn(
              'h-6 w-6 items-center justify-center rounded-md border-2',
              unknown ? 'border-primary bg-primary' : 'border-border bg-background',
            )}
          >
            {unknown ? (
              <Icon as={Check} size={14} strokeWidth={3} className="text-primary-foreground" />
            ) : null}
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-medium">{t('onboarding.lastPeriod.dontRecall')}</Text>
            <Text className="text-muted-foreground text-sm">
              {t('onboarding.lastPeriod.dontRecallHint')}
            </Text>
          </View>
        </Pressable>
      </>
    );
  },
};

export const cycleLengthStep: StepDefinition = {
  Body: function CycleLengthBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.cycleLength.title');
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.cycleLength.subtitle')} />
        <ValueSlider
          label={title}
          value={draft.cycleLengthDays}
          min={CYCLE_LENGTH.min}
          max={CYCLE_LENGTH.max}
          onChange={(cycleLengthDays) => update({ cycleLengthDays })}
          format={(days) => t('onboarding.cycleLength.value', { count: days })}
        />
        <Text className="text-muted-foreground text-center text-sm">
          {t('onboarding.cycleLength.hint')}
        </Text>
      </>
    );
  },
};

export const discreetModeStep: StepDefinition = {
  Body: function DiscreetModeBody({ draft, update }) {
    const { t } = useTranslation();
    return (
      <>
        <HeroIcon icon={EyeOff} />
        <StepHeading
          title={t('onboarding.discreetMode.title')}
          subtitle={t('onboarding.discreetMode.subtitle')}
        />
        <ToggleRow
          label={t('onboarding.discreetMode.toggle')}
          description={t('onboarding.discreetMode.hint')}
          value={draft.discreetMode}
          onChange={(discreetMode) => update({ discreetMode })}
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

export const heightStep: StepDefinition = {
  Body: function HeightBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.height.title');
    const cm = draft.heightCm ?? HEIGHT_CM.default;

    // The slider shows a starting value, so record it as the answer until it's moved.
    useEffect(() => {
      if (draft.heightCm === undefined) update({ heightCm: HEIGHT_CM.default });
    }, [draft.heightCm, update]);

    const imperial = draft.heightUnit === 'ftin';
    const inches = Math.round(cm / CM_PER_INCH);
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.height.subtitle')} />
        <ModeSwitch<HeightUnit>
          value={draft.heightUnit}
          onChange={(heightUnit) => update({ heightUnit })}
          options={[
            { value: 'cm', label: t('onboarding.units.cm') },
            { value: 'ftin', label: t('onboarding.units.ftin') },
          ]}
        />
        {imperial ? (
          <ValueSlider
            label={title}
            value={inches}
            min={Math.ceil(HEIGHT_CM.min / CM_PER_INCH)}
            max={Math.floor(HEIGHT_CM.max / CM_PER_INCH)}
            onChange={(value) => update({ heightCm: round1(value * CM_PER_INCH) })}
            format={(value) =>
              t('onboarding.height.ftinValue', { feet: Math.floor(value / 12), inches: value % 12 })
            }
          />
        ) : (
          <ValueSlider
            label={title}
            value={Math.round(cm)}
            min={HEIGHT_CM.min}
            max={HEIGHT_CM.max}
            onChange={(heightCm) => update({ heightCm })}
            format={(value) => t('onboarding.height.cmValue', { value })}
          />
        )}
      </>
    );
  },
};

export const weightStep: StepDefinition = {
  Body: function WeightBody({ draft, update }) {
    const { t } = useTranslation();
    const title = t('onboarding.weight.title');
    const kg = draft.weightKg ?? WEIGHT_KG.default;

    useEffect(() => {
      if (draft.weightKg === undefined) update({ weightKg: WEIGHT_KG.default });
    }, [draft.weightKg, update]);

    const imperial = draft.weightUnit === 'lb';
    return (
      <>
        <StepHeading title={title} subtitle={t('onboarding.weight.subtitle')} />
        <ModeSwitch<WeightUnit>
          value={draft.weightUnit}
          onChange={(weightUnit) => update({ weightUnit })}
          options={[
            { value: 'kg', label: t('onboarding.units.kg') },
            { value: 'lb', label: t('onboarding.units.lb') },
          ]}
        />
        {imperial ? (
          <ValueSlider
            label={title}
            value={Math.round(kg / KG_PER_LB)}
            min={Math.ceil(WEIGHT_KG.min / KG_PER_LB)}
            max={Math.floor(WEIGHT_KG.max / KG_PER_LB)}
            onChange={(lb) => update({ weightKg: round1(lb * KG_PER_LB) })}
            format={(value) => t('onboarding.weight.lbValue', { value })}
          />
        ) : (
          <ValueSlider
            label={title}
            value={Math.round(kg)}
            min={WEIGHT_KG.min}
            max={WEIGHT_KG.max}
            onChange={(weightKg) => update({ weightKg })}
            format={(value) => t('onboarding.weight.kgValue', { value })}
          />
        )}
      </>
    );
  },
};

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
