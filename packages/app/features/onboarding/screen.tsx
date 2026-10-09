'use client';

import {
  buildOnboardingPayload,
  type FlowContext,
  isStepAnswered,
  isStepVisible,
  nextStep,
  ONBOARDING_STEPS,
  previousStep,
  resolveCurrentStep,
  type StepId,
  submitOnboarding,
  visibleSteps,
} from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Button,
  ChefHat,
  ClipboardCheck,
  type IconComponent,
  PartyPopper,
  Text,
  UserRoundCheck,
} from '@aurora/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { useIsOnline } from '../../lib/use-online';
import { FormMessage } from '../auth/components/form';
import { onboardingQueryKey, useAuthStore, useSignOut } from '../auth/session';
import { type CelebrationTone, FinaleScreen, MilestoneScreen } from './components/celebration';
import { OnboardingLayout } from './components/layout';
import { useOnboardingDraft } from './draft-store';
import { dietStep, goalStep, heardFromStep, kitchenStep } from './steps/intro-steps';
import { notificationsStep, widgetStep } from './steps/permission-steps';
import {
  activityStep,
  ageStep,
  bodyTypeStep,
  healthStep,
  heightStep,
  sexStep,
  weightStep,
} from './steps/profile-steps';
import { calibrationStep } from './steps/review-step';
import { sandboxStep } from './steps/sandbox-step';
import { signUpStep } from './steps/sign-up-step';
import type { StepDefinition, StepProps } from './steps/types';
import { welcomeStep } from './steps/welcome-step';

const STEPS: Record<StepId, StepDefinition> = {
  welcome: welcomeStep,
  heardFrom: heardFromStep,
  goal: goalStep,
  diet: dietStep,
  kitchen: kitchenStep,
  sandbox: sandboxStep,
  sex: sexStep,
  signUp: signUpStep,
  bodyType: bodyTypeStep,
  age: ageStep,
  height: heightStep,
  weight: weightStep,
  activity: activityStep,
  health: healthStep,
  calibration: calibrationStep,
  notifications: notificationsStep,
  widget: widgetStep,
};

type Section = 'start' | 'kitchen' | 'you' | 'body' | 'finish';

/** Section label shown above each step. */
const SECTIONS: Partial<Record<StepId, Section>> = {
  heardFrom: 'start',
  goal: 'start',
  diet: 'kitchen',
  kitchen: 'kitchen',
  sandbox: 'kitchen',
  sex: 'you',
  bodyType: 'body',
  age: 'body',
  height: 'body',
  weight: 'body',
  activity: 'body',
  health: 'body',
  calibration: 'finish',
  notifications: 'finish',
  widget: 'finish',
};

type Milestone = 'kitchen' | 'profile' | 'account' | 'almost';

/**
 * Short celebration screens at the end of a section (all copy is static). Olive and light
 * alternate so they don't all look the same; confetti is kept for creating the account.
 */
const MILESTONES: Record<
  Milestone,
  { icon: IconComponent; tone: CelebrationTone; burst: 'confetti' | 'dots' }
> = {
  kitchen: { icon: ChefHat, tone: 'olive', burst: 'dots' },
  profile: { icon: UserRoundCheck, tone: 'light', burst: 'dots' },
  account: { icon: PartyPopper, tone: 'olive', burst: 'confetti' },
  almost: { icon: ClipboardCheck, tone: 'light', burst: 'dots' },
};

/** The milestone to celebrate when moving forward from `from` to `to`, if any. */
function milestoneBetween(from: StepId, to: StepId): Milestone | undefined {
  if (from === 'sandbox') return 'kitchen';
  if (to === 'signUp') return 'profile';
  if (to === 'calibration') return 'almost';
  return undefined;
}

/** Pause after a single-select pick before moving on, so the selection registers visually. */
const AUTO_ADVANCE_MS = 280;

/**
 * F2 onboarding. One route for the whole flow: signed out it runs Welcome → questions → sign-up
 * gate; after sign-up the auth gate brings the person back here and it carries on from where it
 * stopped. Answers are saved on the device as they go and sent in one request at the end.
 */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.session?.user.id);
  const signOut = useSignOut();
  const { draft, step: savedStep, update, setStep, reset } = useOnboardingDraft();
  // Set when a step was opened from the review screen: finishing it goes back there.
  const [returnToReview, setReturnToReview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const celebrated = useRef(new Set<Milestone>());
  // Which side the next step slides in from: forward → right, back → left.
  const direction = useRef<'right' | 'left'>('right');
  // Checklist shown while submitting; fixed when the submit starts (the draft is cleared on success).
  const [finaleItems, setFinaleItems] = useState<string[]>([]);

  const ctx: FlowContext = {
    signedIn: status === 'signedIn',
    platform: Platform.OS === 'web' ? 'web' : 'native',
  };
  const current = resolveCurrentStep(savedStep, ctx);
  const isLast = nextStep(current, ctx) === null && ctx.signedIn;
  // Just came back from creating an account: celebrate before carrying on.
  const justSignedUp = ctx.signedIn && savedStep === 'signUp';

  // Whether this step already had an answer when the person arrived (i.e. they came back to it).
  const entered = useRef<{ step: StepId; answered: boolean } | undefined>(undefined);
  if (entered.current?.step !== current) {
    // Skippable questions count as "answered" for Continue; here only a real answer counts.
    const answered =
      current === 'heardFrom' ? draft.heardFrom !== undefined : isStepAnswered(current, draft);
    entered.current = { step: current, answered };
  }
  const answeredOnArrival = entered.current.answered;

  // Remember where we are (e.g. after the sign-up gate resolves to the first post-sign-up step).
  useEffect(() => {
    if (current !== savedStep && !justSignedUp) setStep(current);
  }, [current, savedStep, setStep, justSignedUp]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = useMutation({
    mutationFn: () => submitOnboarding(buildOnboardingPayload(useOnboardingDraft.getState().draft)),
    // Fail fast offline instead of pausing: the answers are already safe in the on-device draft.
    networkMode: 'online',
    retry: 1,
    // The answers are on the server now, so the device copy can go. The finale plays next, and
    // `finish` then lets the auth gate send the person home.
    onSuccess: () => reset(),
  });

  const startSubmit = () => {
    setFinaleItems([
      t('onboarding.finale.items.answers'),
      t('onboarding.finale.items.kitchen'),
      t('onboarding.finale.items.home'),
    ]);
    submit.mutate();
  };

  const finish = () => {
    // The next background refetch (`fetchHasOnboarded`) confirms this against the backend's
    // onboarding_responses row.
    queryClient.setQueryData(onboardingQueryKey(userId), true);
  };

  const goTo = (step: StepId, from: 'right' | 'left' = 'right') => {
    clearTimeout(timer.current);
    direction.current = from;
    submit.reset();
    setStep(step);
  };

  const editFromReview = (step: StepId) => {
    setReturnToReview(true);
    goTo(step);
  };

  const next = () => {
    clearTimeout(timer.current);
    // Read the latest answers: a step may have just updated the draft in the same handler.
    const latest = useOnboardingDraft.getState().draft;

    if (returnToReview && current !== 'calibration') {
      // Back to the review, unless a later question still needs an answer.
      const upcoming = visibleSteps(ctx);
      const pending = upcoming
        .slice(upcoming.indexOf(current) + 1, upcoming.indexOf('calibration'))
        .find((step) => !isStepAnswered(step, latest));
      if (!pending) setReturnToReview(false);
      goTo(pending ?? 'calibration');
      return;
    }

    const following = nextStep(current, ctx);
    if (following) {
      goTo(following);
      // Each one plays once, so going back and forward again doesn't repeat it.
      const reached = milestoneBetween(current, following);
      if (reached && !celebrated.current.has(reached)) {
        celebrated.current.add(reached);
        setMilestone(reached);
      }
    } else if (ctx.signedIn) startSubmit();
  };

  const autoAdvance = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(next, AUTO_ADVANCE_MS);
  };

  const previous = previousStep(current, ctx);
  const definition = STEPS[current];
  const props: StepProps = {
    draft,
    update,
    next,
    autoAdvance,
    goTo: current === 'calibration' ? editFromReview : (step) => goTo(step),
    isLast,
    busy: submit.isPending,
    online,
  };
  const { Body, Footer } = definition;

  // Progress counts question steps only (not Welcome), measured against the whole flow (the
  // post-sign-up steps included while signed out), so the bar doesn't jump at the gate.
  const progressSteps = ONBOARDING_STEPS.filter((s) =>
    s === 'signUp'
      ? !ctx.signedIn
      : s !== 'welcome' && isStepVisible(s, { ...ctx, signedIn: true }),
  );
  const progress =
    current === 'welcome' ? undefined : (progressSteps.indexOf(current) + 1) / progressSteps.length;
  const section = SECTIONS[current];

  let footer: React.ReactNode = null;
  if (Footer) {
    footer = <Footer {...props} />;
  } else if (!definition.hideFooter) {
    // Auto-advancing questions only need a button when coming back to an answered step.
    const showContinue = !definition.auto || answeredOnArrival || returnToReview;
    if (showContinue || definition.skippable) {
      footer = (
        <>
          {showContinue ? (
            <Button size="lg" onPress={next} disabled={!isStepAnswered(current, draft)}>
              <Text>
                {returnToReview ? t('onboarding.backToReview') : t('onboarding.continue')}
              </Text>
            </Button>
          ) : null}
          {definition.skippable && !answeredOnArrival ? (
            <Button variant="ghost" size="lg" onPress={next}>
              <Text>{t('onboarding.skip')}</Text>
            </Button>
          ) : null}
        </>
      );
    }
  }

  // Submitting (unless paused offline) or saved: the finale takes over the screen.
  if ((submit.isPending && !submit.isPaused) || submit.isSuccess) {
    return <FinaleScreen items={finaleItems} saved={submit.isSuccess} onDone={finish} />;
  }

  const showing: Milestone | null = justSignedUp ? 'account' : milestone;
  if (showing) {
    const { icon, tone, burst } = MILESTONES[showing];
    return (
      <MilestoneScreen
        key={showing}
        icon={icon}
        tone={tone}
        burst={burst}
        eyebrow={t(`onboarding.milestones.${showing}.eyebrow`)}
        title={t(`onboarding.milestones.${showing}.title`)}
        subtitle={t(`onboarding.milestones.${showing}.subtitle`)}
        onContinue={() => {
          direction.current = 'right';
          if (justSignedUp) setStep(current);
          setMilestone(null);
        }}
      />
    );
  }

  return (
    <OnboardingLayout
      key={current}
      wide={definition.wide}
      progress={progress}
      eyebrow={section ? t(`onboarding.sections.${section}`) : undefined}
      onBack={previous && !submit.isPending ? () => goTo(previous, 'left') : undefined}
      headerAction={
        ctx.signedIn ? (
          <Pressable
            role="button"
            onPress={() => signOut.mutate()}
            disabled={signOut.isPending || submit.isPending}
            hitSlop={8}
            className="h-10 justify-center px-2 active:opacity-60"
          >
            <Text className="text-muted-foreground text-sm font-medium">{t('auth.signOut')}</Text>
          </Pressable>
        ) : undefined
      }
      footer={
        footer ? (
          <>
            {isLast && !online ? (
              <FormMessage tone="offline">{t('onboarding.finish.offline')}</FormMessage>
            ) : null}
            {submit.isError ? (
              <FormMessage tone="error" action={{ label: t('common.retry'), onPress: startSubmit }}>
                {t('onboarding.finish.error')}
              </FormMessage>
            ) : null}
            {footer}
          </>
        ) : undefined
      }
    >
      <FadeIn from={direction.current} className="grow gap-7">
        <Body {...props} />
      </FadeIn>
    </OnboardingLayout>
  );
}
