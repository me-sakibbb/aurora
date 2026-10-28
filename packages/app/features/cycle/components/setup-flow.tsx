'use client';

import { newId } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Button,
  CalendarDays,
  ChevronLeft,
  Flower2,
  Icon,
  type IconComponent,
  Lock,
  Text,
} from '@aurora/ui';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { useAppRouter } from '../../../lib/navigation';
import { useSession } from '../../auth/session';
import { useProfile } from '../../home/queries';
import { StepHeading } from '../../onboarding/components/layout';
import { HeroIcon } from '../../onboarding/components/visuals';
import { useCycleStatus, useSaveCycleSetup, useSavePeriod } from '../queries';
import {
  CycleLengthField,
  draftFrom,
  FertilityField,
  LastPeriodField,
  lastPeriodAnswered,
  toSetupInput,
  useSetupDraft,
} from './setup-fields';

type Step = 'intro' | 'lastPeriod' | 'length' | 'fertility';

/**
 * Shown the first time an eligible account opens the Cycle tab (F10/F13): what it is, then one
 * question per screen, saved to `POST /ovulation` at the end. Nothing is turned on until then.
 */
export function SetupFlow({
  failed,
  onClearFailed,
}: {
  /** The last save didn't go through. */
  failed: boolean;
  onClearFailed: () => void;
}) {
  const { t } = useTranslation();
  const router = useAppRouter();
  const userId = useSession()?.user.id;
  const status = useCycleStatus();
  const profile = useProfile();
  const save = useSaveCycleSetup();
  const savePeriod = useSavePeriod();
  const stored = useSetupDraft();

  // The fertile-window opt-in lives on the profile row; with no profile it can't be saved yet.
  const hasProfile = Boolean(profile.data);
  const steps: Step[] = hasProfile
    ? ['intro', 'lastPeriod', 'length', 'fertility']
    : ['intro', 'lastPeriod', 'length'];

  // A failed save brings the answers back and lands on the last question.
  const [index, setIndex] = useState(() => (stored.draft ? steps.length - 1 : 0));
  const [draft, setDraft] = useState(() => stored.draft ?? draftFrom(undefined, profile.data));
  const step = steps[index] ?? 'intro';
  const last = index === steps.length - 1;

  const canContinue =
    (step !== 'lastPeriod' || lastPeriodAnswered(draft)) &&
    (step !== 'fertility' || draft.fertility !== null);

  const submit = () => {
    if (!userId) return;
    onClearFailed();
    // The id is kept with the answers, so saving again after a failure updates the same entry.
    const answers = { ...draft, periodId: draft.periodId ?? newId() };
    stored.set(answers);
    save.mutate(toSetupInput(answers, { userId, status: status.data, hasProfile }), {
      onSuccess: () => stored.clear(),
    });
    // The last period also becomes the first entry in the history.
    if (!answers.lastPeriodUnknown && answers.lastPeriodStart) {
      savePeriod.mutate({
        id: answers.periodId,
        userId,
        started_on: answers.lastPeriodStart,
        ended_on: answers.lastPeriodOngoing ? null : answers.lastPeriodEnd,
      });
    }
  };

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="flex-grow px-6 pb-10"
      contentContainerStyle={{ paddingTop: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="mx-auto w-full max-w-md flex-1 gap-6">
        <View className="h-11 flex-row items-center">
          {index > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 rounded-full"
              aria-label={t('onboarding.back')}
              onPress={() => setIndex(index - 1)}
            >
              <Icon as={ChevronLeft} size={24} />
            </Button>
          ) : null}
          <View className="flex-1" />
          {index > 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t('cycle.setup.progress', { step: index, total: steps.length - 1 })}
            </Text>
          ) : null}
        </View>

        <FadeIn key={step} className="flex-1 gap-6">
          {step === 'intro' ? (
            <>
              <HeroIcon icon={Flower2} />
              <StepHeading
                title={t('cycle.setup.intro.title')}
                subtitle={t('cycle.setup.intro.body')}
              />
              <View className="bg-card border-border gap-4 rounded-2xl border p-4 shadow-sm shadow-black/5">
                <Point icon={CalendarDays} text={t('cycle.setup.intro.pointLog')} />
                <Point icon={Lock} text={t('cycle.setup.intro.pointPrivate')} />
              </View>
            </>
          ) : null}
          {step === 'lastPeriod' ? (
            <>
              <StepHeading title={t('cycle.setup.lastPeriod.title')} />
              <LastPeriodField draft={draft} onChange={setDraft} />
            </>
          ) : null}
          {step === 'length' ? (
            <>
              <StepHeading
                title={t('cycle.setup.length.title')}
                subtitle={t('cycle.setup.length.subtitle')}
              />
              <CycleLengthField draft={draft} onChange={setDraft} />
            </>
          ) : null}
          {step === 'fertility' ? (
            <>
              <StepHeading
                title={t('cycle.setup.fertility.title')}
                subtitle={t('cycle.setup.fertility.subtitle')}
              />
              <FertilityField draft={draft} onChange={setDraft} />
            </>
          ) : null}
        </FadeIn>

        {failed && last ? (
          <Text role="alert" className="text-destructive text-center">
            {t('cycle.setup.saveFailed')}
          </Text>
        ) : null}

        <View className="gap-2">
          <Button
            size="lg"
            disabled={!canContinue}
            onPress={() => (last ? submit() : setIndex(index + 1))}
          >
            <Text>
              {step === 'intro'
                ? t('cycle.setup.intro.start')
                : last
                  ? t('cycle.setup.save')
                  : t('onboarding.continue')}
            </Text>
          </Button>
          {step === 'intro' ? (
            <Button variant="ghost" size="lg" onPress={() => router.navigate('/')}>
              <Text>{t('cycle.setup.intro.notNow')}</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Point({ icon, text }: { icon: IconComponent; text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="bg-sage/15 h-10 w-10 items-center justify-center rounded-xl">
        <Icon as={icon} size={20} className="text-primary" />
      </View>
      <Text className="flex-1 text-base leading-6">{text}</Text>
    </View>
  );
}
