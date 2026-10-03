import type { OnboardingDraft, StepId } from '@aurora/api';

export type StepProps = {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  /** Go to the next step; on the last step this submits everything. */
  next: () => void;
  /** `next()` after a short pause, so the person sees their pick register first. */
  autoAdvance: () => void;
  goTo: (step: StepId) => void;
  /** This step's action submits onboarding. */
  isLast: boolean;
  /** Submitting right now (only ever true on the last step). */
  busy: boolean;
  online: boolean;
};

export type StepDefinition = {
  Body: (props: StepProps) => React.ReactNode;
  /** Replaces the default "Continue" button. */
  Footer?: (props: StepProps) => React.ReactNode;
  /**
   * Single-answer question that moves on by itself once answered. "Continue" only shows when
   * the step already had an answer on arrival (coming back to it).
   */
  auto?: boolean;
  /** Shows a "Skip" button. */
  skippable?: boolean;
  /** No bottom action bar (the step's actions are in its body). */
  hideFooter?: boolean;
  /** Full-width page without the card (the landing page). */
  wide?: boolean;
};
