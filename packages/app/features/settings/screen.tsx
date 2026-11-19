'use client';

import {
  ACTIVITY_LEVELS,
  AGE_YEARS,
  BLOOD_PRESSURES,
  BODY_TYPES,
  DIETARY_PATTERNS,
  GOALS,
  type Goal,
  HEIGHT_CM,
  type Profile,
  type ProfileUpdate,
  SEXES,
  toggleGoal,
  WEIGHT_KG,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Icon, SlidersHorizontal, Text } from '@mybela/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { ModeSwitch } from '../../components/mode-switch';
import { Skeleton } from '../../components/skeleton';
import { ValueSlider } from '../../components/value-slider';
import { useInsets } from '../../lib/insets';
import { useIsOnline } from '../../lib/use-online';
import { InlineState, Panel } from '../home/components/primitives';
import { useProfile } from '../home/queries';
import { Choices, SingleChoice } from '../onboarding/components/choices';
import { BodyFigure } from '../onboarding/components/visuals';
import { DIET_ICONS, GOAL_ICONS } from '../onboarding/steps/intro-steps';
import {
  ACTIVITY_ICONS,
  BLOOD_PRESSURE_ICONS,
  CM_PER_INCH,
  KG_PER_LB,
  round1,
  SEX_ICONS,
  Section,
} from '../onboarding/steps/profile-steps';
import { AppTopBar } from '../shell/top-bar';
import { useUpdateProfile } from './queries';

type Draft = Omit<ProfileUpdate, 'goals'> & { goals: Goal[] };
type YesNo = 'yes' | 'no';

const FIELDS = [
  'sex',
  'age_years',
  'height_cm',
  'weight_kg',
  'activity_level',
  'dietary_pattern',
  'body_type',
  'blood_pressure',
  'has_diabetes',
] as const satisfies readonly (keyof ProfileUpdate)[];

/** The stored answers, as the form starts from them. Missing answers stay unanswered. */
function draftFrom(profile: Profile): Draft {
  const draft: Draft = { goals: [...profile.goals] };
  for (const key of FIELDS) {
    const value = profile[key];
    if (value !== null && value !== undefined) Object.assign(draft, { [key]: value });
  }
  return draft;
}

/** Only what changed, so the backend recalculates the target only when it needs to. */
function changesFrom(draft: Draft, profile: Profile): ProfileUpdate {
  const changes: ProfileUpdate = {};
  for (const key of FIELDS) {
    const value = draft[key];
    if (value !== undefined && value !== (profile[key] ?? undefined)) {
      Object.assign(changes, { [key]: value });
    }
  }
  const sameGoals =
    draft.goals.length === profile.goals.length &&
    draft.goals.every((goal) => profile.goals.includes(goal));
  if (!sameGoals) changes.goals = draft.goals;
  return changes;
}

/**
 * F3 Health & goals: the onboarding answers that shape the calorie target and suggestions,
 * pre-filled from the profile and saved with `PATCH /profile`. The new target is shown as the
 * backend returns it.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const online = useIsOnline();
  const insets = useInsets();
  const save = useUpdateProfile();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  // Start from the stored answers once they arrive; don't overwrite edits on a refetch.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current && profile.data) {
      started.current = true;
      setDraft(draftFrom(profile.data));
    }
  }, [profile.data]);

  const changes = useMemo(
    () => (draft && profile.data ? changesFrom(draft, profile.data) : {}),
    [draft, profile.data],
  );
  const dirty = Object.keys(changes).length > 0;

  const update = (patch: Partial<Draft>) => {
    if (save.isSuccess || save.isError) save.reset();
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  let body: React.ReactNode;
  if (profile.data === undefined && !profile.isError && online) {
    body = (
      <View className="gap-4" aria-busy>
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </View>
    );
  } else if (profile.data === undefined) {
    body = (
      <InlineState
        kind={online ? undefined : 'offline'}
        error={profile.error}
        onRetry={() => profile.refetch()}
      />
    );
  } else if (profile.data === null) {
    body = (
      <Panel className="items-center gap-3 py-8">
        <View className="bg-muted h-14 w-14 items-center justify-center rounded-full">
          <Icon as={SlidersHorizontal} size={24} className="text-muted-foreground" />
        </View>
        <Text className="text-center font-semibold">{t('settings.noProfileTitle')}</Text>
        <Text variant="muted" className="max-w-sm text-center leading-6">
          {t('settings.noProfileBody')}
        </Text>
      </Panel>
    );
  } else if (draft) {
    body = (
      <SettingsForm
        draft={draft}
        update={update}
        heightUnit={heightUnit}
        setHeightUnit={setHeightUnit}
        weightUnit={weightUnit}
        setWeightUnit={setWeightUnit}
      />
    );
  }

  const target = save.data?.target_kcal;

  return (
    <View className="bg-background flex-1">
      <AppTopBar back />
      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-lg gap-5 px-5 pb-10"
        contentContainerStyle={{ paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text role="heading" aria-level={2} className="text-2xl font-bold tracking-tight">
            {t('settings.title')}
          </Text>
          <Text variant="muted" className="leading-6">
            {t('settings.subtitle')}
          </Text>
        </View>
        {body}
      </ScrollView>

      {profile.data && draft ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="bg-background border-border border-t px-5 pt-3"
        >
          <View className="mx-auto w-full max-w-lg gap-2">
            {save.isSuccess ? (
              <FadeIn>
                <Text className="text-center text-sm font-medium" role="status">
                  {target != null
                    ? t('settings.savedTarget', {
                        kcal: Math.round(target).toLocaleString(),
                      })
                    : t('settings.savedNoTarget')}
                </Text>
              </FadeIn>
            ) : save.isError ? (
              <Text className="text-destructive text-center text-sm" role="alert">
                {t('settings.error')}
              </Text>
            ) : !online ? (
              <Text variant="muted" className="text-center text-sm">
                {t('settings.offline')}
              </Text>
            ) : null}
            <Button
              size="lg"
              disabled={!dirty || !online || save.isPending}
              onPress={() => save.mutate(changes)}
            >
              {save.isPending ? <ActivityIndicator className="text-primary-foreground" /> : null}
              <Text>{save.isPending ? t('settings.saving') : t('settings.save')}</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SettingsForm({
  draft,
  update,
  heightUnit,
  setHeightUnit,
  weightUnit,
  setWeightUnit,
}: {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  heightUnit: 'cm' | 'ftin';
  setHeightUnit: (unit: 'cm' | 'ftin') => void;
  weightUnit: 'kg' | 'lb';
  setWeightUnit: (unit: 'kg' | 'lb') => void;
}) {
  const { t } = useTranslation();
  const heightLabel = t('onboarding.measurements.height');
  const weightLabel = t('onboarding.measurements.weight');
  const cm = draft.height_cm ?? HEIGHT_CM.default;
  const kg = draft.weight_kg ?? WEIGHT_KG.default;
  const diabetes: YesNo | undefined =
    draft.has_diabetes === undefined ? undefined : draft.has_diabetes ? 'yes' : 'no';

  return (
    <View className="gap-4">
      <Section label={t('settings.goals')}>
        <Choices<Goal>
          label={t('settings.goals')}
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
      </Section>

      <Section label={t('settings.diet')}>
        <SingleChoice
          label={t('settings.diet')}
          value={draft.dietary_pattern}
          onChange={(dietary_pattern) => update({ dietary_pattern })}
          choices={DIETARY_PATTERNS.map((value) => ({
            value,
            label: t(`onboarding.options.diet.${value}`),
            icon: DIET_ICONS[value],
          }))}
        />
      </Section>

      <Section label={t('settings.sex')}>
        <SingleChoice
          label={t('settings.sex')}
          layout="grid"
          value={draft.sex}
          onChange={(sex) => update({ sex })}
          choices={SEXES.map((value) => ({
            value,
            label: t(`onboarding.options.sex.${value}`),
            icon: SEX_ICONS[value],
          }))}
        />
      </Section>

      <Section label={t('settings.age')}>
        <ValueSlider
          size="sm"
          label={t('settings.age')}
          value={draft.age_years ?? AGE_YEARS.default}
          min={AGE_YEARS.min}
          max={AGE_YEARS.max}
          onChange={(age_years) => update({ age_years })}
          format={(value) => t('settings.ageValue', { value })}
        />
      </Section>

      <Section
        label={heightLabel}
        units={
          <ModeSwitch
            value={heightUnit}
            onChange={setHeightUnit}
            options={[
              { value: 'cm', label: t('onboarding.units.cm') },
              { value: 'ftin', label: t('onboarding.units.ftin') },
            ]}
          />
        }
      >
        {heightUnit === 'ftin' ? (
          <ValueSlider
            size="sm"
            label={heightLabel}
            value={Math.round(cm / CM_PER_INCH)}
            min={Math.ceil(HEIGHT_CM.min / CM_PER_INCH)}
            max={Math.floor(HEIGHT_CM.max / CM_PER_INCH)}
            onChange={(inches) => update({ height_cm: Math.round(inches * CM_PER_INCH) })}
            format={(value) =>
              t('onboarding.height.ftinValue', { feet: Math.floor(value / 12), inches: value % 12 })
            }
          />
        ) : (
          <ValueSlider
            size="sm"
            label={heightLabel}
            value={Math.round(cm)}
            min={HEIGHT_CM.min}
            max={HEIGHT_CM.max}
            onChange={(height_cm) => update({ height_cm })}
            format={(value) => t('onboarding.height.cmValue', { value })}
          />
        )}
      </Section>

      <Section
        label={weightLabel}
        units={
          <ModeSwitch
            value={weightUnit}
            onChange={setWeightUnit}
            options={[
              { value: 'kg', label: t('onboarding.units.kg') },
              { value: 'lb', label: t('onboarding.units.lb') },
            ]}
          />
        }
      >
        {weightUnit === 'lb' ? (
          <ValueSlider
            size="sm"
            label={weightLabel}
            value={Math.round(kg / KG_PER_LB)}
            min={Math.ceil(WEIGHT_KG.min / KG_PER_LB)}
            max={Math.floor(WEIGHT_KG.max / KG_PER_LB)}
            onChange={(lb) => update({ weight_kg: round1(lb * KG_PER_LB) })}
            format={(value) => t('onboarding.weight.lbValue', { value })}
          />
        ) : (
          <ValueSlider
            size="sm"
            label={weightLabel}
            value={Math.round(kg)}
            min={WEIGHT_KG.min}
            max={WEIGHT_KG.max}
            onChange={(weight_kg) => update({ weight_kg })}
            format={(value) => t('onboarding.weight.kgValue', { value })}
          />
        )}
      </Section>

      <Section label={t('settings.bodyType')}>
        <SingleChoice
          label={t('settings.bodyType')}
          layout="grid"
          value={draft.body_type}
          onChange={(body_type) => update({ body_type })}
          choices={BODY_TYPES.map((value) => ({
            value,
            label: t(`onboarding.options.bodyType.${value}`),
            visual: (selected) => <BodyFigure type={value} selected={selected} />,
          }))}
        />
      </Section>

      <Section label={t('settings.activity')}>
        <SingleChoice
          label={t('settings.activity')}
          value={draft.activity_level}
          onChange={(activity_level) => update({ activity_level })}
          choices={ACTIVITY_LEVELS.map((value) => ({
            value,
            label: t(`onboarding.options.activity.${value}`),
            description: t(`onboarding.options.activityHint.${value}`),
            icon: ACTIVITY_ICONS[value],
          }))}
        />
      </Section>

      <Section label={t('onboarding.health.bloodPressure')}>
        <SingleChoice
          label={t('onboarding.health.bloodPressure')}
          layout="grid"
          value={draft.blood_pressure}
          onChange={(blood_pressure) => update({ blood_pressure })}
          choices={BLOOD_PRESSURES.map((value) => ({
            value,
            label: t(`onboarding.options.bloodPressure.${value}`),
            icon: BLOOD_PRESSURE_ICONS[value],
          }))}
        />
      </Section>

      <Section label={t('onboarding.health.diabetes')}>
        <SingleChoice<YesNo>
          label={t('onboarding.health.diabetes')}
          layout="grid"
          value={diabetes}
          onChange={(value) => update({ has_diabetes: value === 'yes' })}
          choices={[
            { value: 'yes', label: t('onboarding.health.yes') },
            { value: 'no', label: t('onboarding.health.no') },
          ]}
        />
      </Section>
    </View>
  );
}
