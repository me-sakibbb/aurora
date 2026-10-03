'use client';

import { emptyDraft, kv, type OnboardingDraft, type StepId } from '@aurora/api';
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
      // Fill in fields added in later versions of the draft shape.
      merge: (persisted, current) => {
        const saved = persisted as Partial<Pick<DraftState, 'draft' | 'step'>> | undefined;
        return { ...current, step: saved?.step, draft: { ...emptyDraft(), ...saved?.draft } };
      },
    },
  ),
);
