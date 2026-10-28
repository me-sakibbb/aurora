'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Text } from '@aurora/ui';
import { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useSession } from '../../auth/session';
import { useProfile } from '../../home/queries';
import { useSheets } from '../../shell/sheets';
import { useCycleStatus, useSaveCycleSetup, useTurnOffCycle } from '../queries';
import {
  CycleLengthField,
  draftFrom,
  FertilityField,
  type SetupDraft,
  toSetupInput,
} from './setup-fields';

/**
 * Cycle settings for an opted-in account: cycle length and the fertile-window choice, pre-filled
 * and editable, and turning tracking off. Period dates are edited in the Cycle tab's history. Opened from the profile sheet and the Cycle tab; drawn once by the shell.
 */
export function CycleSettingsSheet() {
  const { t } = useTranslation();
  const open = useSheets((s) => s.open === 'cycleSettings');
  const close = useSheets((s) => s.close);
  const userId = useSession()?.user.id;
  const status = useCycleStatus();
  const profile = useProfile();
  const save = useSaveCycleSetup();
  const turnOff = useTurnOffCycle();
  const { height } = useWindowDimensions();

  const [draft, setDraft] = useState<SetupDraft>(() => draftFrom(status.data, profile.data));
  const [confirmOff, setConfirmOff] = useState(false);

  // Start from what's stored each time the sheet opens, but don't overwrite edits in progress
  // when the data refreshes while it's open.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft(draftFrom(status.data, profile.data));
      setConfirmOff(false);
    }
    wasOpen.current = open;
  }, [open, status.data, profile.data]);

  const hasProfile = Boolean(profile.data);
  const onSave = () => {
    if (!userId) return;
    save.mutate(toSetupInput(draft, { userId, status: status.data, hasProfile }));
    close();
  };

  const onTurnOff = () => {
    if (!userId) return;
    turnOff.mutate({ userId });
    close();
  };

  return (
    <Sheet open={open} onClose={close} label={t('cycle.settings.title')}>
      <SheetScrollView style={{ maxHeight: height * 0.85 }} contentContainerClassName="gap-6 pb-2">
        <Text role="heading" aria-level={2} className="text-xl font-semibold">
          {t('cycle.settings.title')}
        </Text>

        <View className="gap-2">
          <Text className="font-semibold">{t('cycle.setup.length.title')}</Text>
          <CycleLengthField draft={draft} onChange={setDraft} size="sm" />
        </View>

        {hasProfile ? (
          <View className="gap-2">
            <Text className="font-semibold">{t('cycle.setup.fertility.title')}</Text>
            <Text variant="muted">{t('cycle.setup.fertility.subtitle')}</Text>
            <FertilityField draft={draft} onChange={setDraft} />
          </View>
        ) : null}

        <Button size="lg" onPress={onSave}>
          <Text>{t('cycle.settings.save')}</Text>
        </Button>

        <View className="border-border gap-3 border-t pt-5">
          {confirmOff ? (
            <View className="gap-3">
              <Text className="font-semibold">{t('cycle.settings.offConfirmTitle')}</Text>
              <Text variant="muted">{t('cycle.settings.offConfirmBody')}</Text>
              <View className="flex-row gap-3">
                <Button variant="outline" className="flex-1" onPress={() => setConfirmOff(false)}>
                  <Text>{t('common.cancel')}</Text>
                </Button>
                <Button variant="destructive" className="flex-1" onPress={onTurnOff}>
                  <Text>{t('cycle.settings.turnOff')}</Text>
                </Button>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setConfirmOff(true)}
              className="items-center rounded-2xl py-3 active:opacity-60"
            >
              <Text className="text-destructive font-semibold">{t('cycle.settings.turnOff')}</Text>
            </Pressable>
          )}
        </View>
      </SheetScrollView>
    </Sheet>
  );
}
