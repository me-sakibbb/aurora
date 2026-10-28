'use client';

import { newId, nextRange, type Period, validatePeriodDates } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { Button, Icon, Text, Trash2 } from '@aurora/ui';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { DatePicker } from '../../../components/date-picker';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useSession } from '../../auth/session';
import { useDateLocale } from '../../home/use-date-locale';
import { useDeletePeriod, useSavePeriod } from '../queries';
import { CheckRow, today } from './setup-fields';

export type PeriodSheetMode =
  | { kind: 'start'; date?: string }
  | { kind: 'end'; period: Period }
  | { kind: 'edit'; period: Period };

/**
 * Logging a period's start or end, or changing / deleting a logged one (F10). Saves go through
 * keyed mutations, so they're kept and retried when the connection is down.
 */
export function PeriodSheet({
  mode,
  onClose,
}: {
  mode: PeriodSheetMode | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { height } = useWindowDimensions();
  const userId = useSession()?.user.id;
  const save = useSavePeriod();
  const remove = useDeletePeriod();

  const [startedOn, setStartedOn] = useState(today());
  const [endedOn, setEndedOn] = useState<string | null>(null);
  /** Edit mode: the period hasn't ended (as opposed to the end not being picked yet). */
  const [ongoing, setOngoing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset to the period being opened each time.
  useEffect(() => {
    if (!mode) return;
    setConfirmDelete(false);
    if (mode.kind === 'start') {
      setStartedOn(mode.date ?? today());
      setEndedOn(null);
      setOngoing(false);
    } else {
      setStartedOn(mode.period.started_on);
      setEndedOn(mode.kind === 'end' ? today() : mode.period.ended_on);
      setOngoing(mode.kind === 'edit' && mode.period.ended_on === null);
    }
  }, [mode]);

  const error = validatePeriodDates(startedOn, endedOn, today());
  // Editing: after re-marking the start, the end still has to be picked (or "still going").
  const needsEnd = mode?.kind === 'edit' && !ongoing && endedOn === null;
  const title = mode
    ? t(
        mode.kind === 'start'
          ? 'cycle.period.logStart'
          : mode.kind === 'end'
            ? 'cycle.period.logEnd'
            : 'cycle.period.edit',
      )
    : '';

  const onSave = () => {
    if (!mode || !userId || error || needsEnd) return;
    const id = mode.kind === 'start' ? newId() : mode.period.id;
    save.mutate({ id, userId, started_on: startedOn, ended_on: ongoing ? null : endedOn });
    onClose();
  };

  const onDelete = () => {
    if (!mode || mode.kind === 'start' || !userId) return;
    remove.mutate({ id: mode.period.id, userId });
    onClose();
  };

  const long = (iso: string) => format(parseISO(iso), 'd MMMM yyyy', { locale });

  return (
    <Sheet open={mode !== null} onClose={onClose} label={title}>
      <SheetScrollView style={{ maxHeight: height * 0.88 }} contentContainerClassName="gap-5 pb-2">
        <Text role="heading" aria-level={2} className="text-xl font-semibold">
          {title}
        </Text>

        <Text variant="muted" aria-live="polite">
          {mode?.kind === 'edit'
            ? needsEnd
              ? t('cycle.setup.lastPeriod.pickEnd')
              : ongoing
                ? t('cycle.period.ongoingSince', { date: long(startedOn) })
                : endedOn
                  ? t('home.cycle.range', { start: long(startedOn), end: long(endedOn) })
                  : null
            : mode?.kind === 'end'
              ? t('cycle.period.endHint', { date: long(startedOn) })
              : t('cycle.period.startHint')}
        </Text>

        {mode?.kind === 'start' ? (
          <DatePicker
            key={`start-${mode.date ?? ''}`}
            label={t('cycle.period.started')}
            value={startedOn}
            max={today()}
            onChange={setStartedOn}
          />
        ) : mode?.kind === 'end' ? (
          <DatePicker
            key="end"
            label={t('cycle.period.ended')}
            value={startedOn}
            rangeEnd={endedOn}
            max={today()}
            onChange={setEndedOn}
          />
        ) : mode?.kind === 'edit' ? (
          <View className="gap-4">
            <DatePicker
              key={`edit-${mode.period.id}`}
              label={t('cycle.period.edit')}
              value={startedOn}
              rangeEnd={ongoing ? null : endedOn}
              max={today()}
              onChange={(date) => {
                const range = nextRange({ start: startedOn, end: ongoing ? null : endedOn }, date);
                setStartedOn(range.start);
                setEndedOn(range.end);
                if (range.end !== null) setOngoing(false);
              }}
            />
            <CheckRow
              label={t('cycle.period.stillOngoing')}
              checked={ongoing}
              onChange={(next) => {
                setOngoing(next);
                if (next) setEndedOn(null);
              }}
            />
          </View>
        ) : null}

        {error ? (
          <Text role="alert" className="text-destructive">
            {t(error)}
          </Text>
        ) : null}

        <Button size="lg" disabled={Boolean(error) || needsEnd} onPress={onSave}>
          <Text>{t('cycle.period.save')}</Text>
        </Button>

        {mode?.kind === 'edit' ? (
          <View className="border-border border-t pt-4">
            {confirmDelete ? (
              <View className="gap-3">
                <Text className="font-semibold">{t('cycle.period.deleteTitle')}</Text>
                <Text variant="muted">{t('cycle.period.deleteBody')}</Text>
                <View className="flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => setConfirmDelete(false)}
                  >
                    <Text>{t('common.cancel')}</Text>
                  </Button>
                  <Button variant="destructive" className="flex-1" onPress={onDelete}>
                    <Text>{t('cycle.period.delete')}</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmDelete(true)}
                className="flex-row items-center justify-center gap-2 rounded-2xl py-3 active:opacity-60"
              >
                <Icon as={Trash2} size={18} className="text-destructive" />
                <Text className="text-destructive font-semibold">{t('cycle.period.delete')}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </SheetScrollView>
    </Sheet>
  );
}
