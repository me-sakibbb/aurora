'use client';

import {
  emptyDraft,
  kv,
  type OnboardingDraft,
  restoreDraft,
  restoreStep,
  type StepId,
} from '@aurora/api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type DraftState = {
  draft: OnboardingDraft;
  /** Last step shown, so a restart (or the Google sign-in redirect on web) resumes there. */
  step?: StepId;
  update: (patch: Partial<OnboardingDraft>) => void;
  setStep: (step: StepId) => void;
  reset: () => void;
};

/**
 * Onboarding answers, saved on the device as they're given (MMKV on native, localStorage on web).
 * Pre-sign-up answers have no account yet, and nothing should be lost if the app closes mid-way.
 * Cleared after a successful submit and on sign-out (shared phones).
 */
export const useOnboardingDraft = create<DraftState>()(
  persist(
    (set) => ({
      draft: emptyDraft(),
      step: undefined,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setStep: (step) => set({ step }),
      reset: () => set({ draft: emptyDraft(), step: undefined }),
    }),
    {
      name: 'aurora.onboarding',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: kv.get,
        setItem: kv.set,
        removeItem: kv.remove,
      })),
      partialize: ({ draft, step }) => ({ draft, step }),
      // Drafts saved by older versions may hold answers or steps that have since changed.
      merge: (persisted, current) => {
        const saved = persisted as { draft?: unknown; step?: unknown } | undefined;
        return { ...current, step: restoreStep(saved?.step), draft: restoreDraft(saved?.draft) };
      },
    },
  ),
);
