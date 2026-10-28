'use client';

import { CYCLE_LENGTH, type CycleStatus, nextRange, type Profile } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Check, cn, Icon, Text } from '@aurora/ui';
import { format } from 'date-fns';
import { Pressable, View } from 'react-native';
import { create } from 'zustand';
import { DatePicker } from '../../../components/date-picker';
import { ValueSlider } from '../../../components/value-slider';
import { tapHaptic } from '../../../lib/haptics';
import { SingleChoice } from '../../onboarding/components/choices';

export type SetupDraft = {
  lastPeriodStart: string | null;
  /** Last day of that period; null while not picked or still going. */
  lastPeriodEnd: string | null;
  lastPeriodOngoing: boolean;
  lastPeriodUnknown: boolean;
  /** Id of the history entry setup creates, made on first save so a retry updates the same row. */
  periodId: string | null;
  cycleLength: number;
  lengthUnsure: boolean;
  /** Null until the person answers (F11: the fertile window is strictly opt-in). */
  fertility: boolean | null;
};

/**
 * The answers being edited, kept in memory outside the screen: saving flips the Cycle tab to its
 * main view right away, and if the save then fails the setup comes back with the answers intact.
 */
export const useSetupDraft = create<{
  draft: SetupDraft | null;
  set: (draft: SetupDraft) => void;
  clear: () => void;
}>((set) => ({
  draft: null,
  set: (draft) => set({ draft }),
  clear: () => set({ draft: null }),
}));

/** The answers as stored, or a blank setup. */
export function draftFrom(status: CycleStatus | undefined, profile: Profile | null | undefined) {
  const settings = status?.enabled ? status.ovulation : null;
  return {
    lastPeriodStart: settings?.last_period_start ?? null,
    lastPeriodEnd: null,
    lastPeriodOngoing: false,
    periodId: null,
    lastPeriodUnknown: settings?.last_period_unknown === true,
    cycleLength: settings?.cycle_length_days ?? CYCLE_LENGTH.default,
    lengthUnsure: Boolean(settings) && settings?.cycle_length_days == null,
    fertility: status?.enabled ? profile?.wants_fertility_estimate === true : null,
  } satisfies SetupDraft;
}

export const today = () => format(new Date(), 'yyyy-MM-dd');

/** A full-width option that can be switched on and off (e.g. "I don't remember"). */
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      onPress={() => {
        tapHaptic();
        onChange(!checked);
      }}
      className={cn(
        'bg-card min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-4 active:opacity-90',
        checked ? 'border-primary' : 'border-border',
      )}
    >
      <Text className="flex-1 text-base font-medium">{label}</Text>
      <View
        aria-hidden
        className={cn(
          'h-6 w-6 items-center justify-center rounded-md border-2',
          checked ? 'border-primary bg-primary' : 'border-border bg-background',
        )}
      >
        {checked ? (
          <Icon as={Check} size={14} strokeWidth={3} className="text-primary-foreground" />
        ) : null}
      </View>
    </Pressable>
  );
}

/** The setup's last period, marked on the calendar as a start-to-end span (or ongoing). */
export function LastPeriodField({
  draft,
  onChange,
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
}) {
  const { t } = useTranslation();
  const hint = !draft.lastPeriodStart
    ? t('cycle.setup.lastPeriod.pickStart')
    : draft.lastPeriodEnd === null && !draft.lastPeriodOngoing
      ? t('cycle.setup.lastPeriod.pickEnd')
      : null;

  return (
    <View className="gap-4">
      <View className={cn('gap-3', draft.lastPeriodUnknown && 'opacity-40')}>
        {hint && !draft.lastPeriodUnknown ? (
          <Text className="text-muted-foreground" aria-live="polite">
            {hint}
          </Text>
        ) : null}
        <DatePicker
          label={t('cycle.setup.lastPeriod.title')}
          value={draft.lastPeriodUnknown ? null : draft.lastPeriodStart}
          rangeEnd={draft.lastPeriodUnknown ? null : draft.lastPeriodEnd}
          max={today()}
          onChange={(date) => {
            const range = nextRange(
              {
                start: draft.lastPeriodStart,
                end: draft.lastPeriodOngoing ? null : draft.lastPeriodEnd,
              },
              date,
            );
            onChange({
              ...draft,
              lastPeriodStart: range.start,
              lastPeriodEnd: range.end,
              // Picking an end day means it's over.
              lastPeriodOngoing: range.end === null && draft.lastPeriodOngoing,
              lastPeriodUnknown: false,
            });
          }}
        />
      </View>
      {draft.lastPeriodStart && !draft.lastPeriodUnknown ? (
        <CheckRow
          label={t('cycle.period.stillOngoing')}
          checked={draft.lastPeriodOngoing}
          onChange={(ongoing) =>
            onChange({ ...draft, lastPeriodOngoing: ongoing, lastPeriodEnd: null })
          }
        />
      ) : null}
      <CheckRow
        label={t('cycle.setup.lastPeriod.unknown')}
        checked={draft.lastPeriodUnknown}
        onChange={(unknown) => onChange({ ...draft, lastPeriodUnknown: unknown })}
      />
    </View>
  );
}

/** The last-period answer is complete: a start with an end (or still going), or "don't remember". */
export function lastPeriodAnswered(draft: SetupDraft) {
  return (
    draft.lastPeriodUnknown ||
    (draft.lastPeriodStart !== null && (draft.lastPeriodEnd !== null || draft.lastPeriodOngoing))
  );
}

export function CycleLengthField({
  draft,
  onChange,
  size = 'lg',
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
  size?: 'lg' | 'sm';
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      <View className={cn(draft.lengthUnsure && 'opacity-40')}>
        <ValueSlider
          label={t('cycle.setup.length.title')}
          value={draft.cycleLength}
          min={CYCLE_LENGTH.min}
          max={CYCLE_LENGTH.max}
          size={size}
          format={(days) => t('cycle.days', { count: days })}
          onChange={(days) => onChange({ ...draft, cycleLength: days, lengthUnsure: false })}
        />
      </View>
      <CheckRow
        label={t('cycle.setup.length.unsure')}
        checked={draft.lengthUnsure}
        onChange={(unsure) => onChange({ ...draft, lengthUnsure: unsure })}
      />
    </View>
  );
}

export function FertilityField({
  draft,
  onChange,
}: {
  draft: SetupDraft;
  onChange: (draft: SetupDraft) => void;
}) {
  const { t } = useTranslation();
  return (
    <SingleChoice<'yes' | 'no'>
      label={t('cycle.setup.fertility.title')}
      value={draft.fertility === null ? null : draft.fertility ? 'yes' : 'no'}
      onChange={(value) => onChange({ ...draft, fertility: value === 'yes' })}
      choices={[
        { value: 'yes', label: t('cycle.setup.fertility.yes') },
        { value: 'no', label: t('cycle.setup.fertility.no') },
      ]}
    />
  );
}

/** The input for saving: what the person answered, plus the stored discreet-mode value. */
export function toSetupInput(
  draft: SetupDraft,
  {
    userId,
    status,
    hasProfile,
  }: { userId: string; status: CycleStatus | undefined; hasProfile: boolean },
) {
  return {
    userId,
    lastPeriodStart: draft.lastPeriodUnknown ? null : draft.lastPeriodStart,
    cycleLengthDays: draft.lengthUnsure ? null : draft.cycleLength,
    // Stored on the profile row, so it can only be saved once there is one.
    fertilityEstimate: hasProfile && draft.fertility !== null ? draft.fertility : undefined,
    discreetMode: status?.ovulation?.discreet_mode === true,
  };
}
