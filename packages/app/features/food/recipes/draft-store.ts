'use client';

import { kv, type PickedPhoto } from '@mybela/api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CookingMethod } from '../method-icons';

export type DraftIngredient = {
  food_id: string;
  name_en: string;
  name_bn: string | null;
  /** The ingredient's photo, once the backend has them (older drafts don't have the field). */
  image_url?: string | null;
  /** Edible grams as typed; `null` while the field is empty. */
  grams: number | null;
};

/** Everything typed into the recipe editor, kept on the device so leaving doesn't lose it. */
export type RecipeDraft = {
  name: string;
  nameBn: string;
  method: CookingMethod | null;
  /** A newly picked, already compressed photo, not uploaded yet. */
  photo: PickedPhoto | null;
  /**
   * The photo URL the recipe has now (editing) or one already uploaded by a save that then failed,
   * so a retry doesn't upload again. Sent back as `thumbnail_url` when no new photo is picked.
   */
  photoUrl: string | null;
  ingredients: DraftIngredient[];
  /** The finished dish's weight in grams, as typed. */
  finishedGrams: number | null;
  servings: number;
  step: number;
};

export const emptyDraft = (): RecipeDraft => ({
  name: '',
  nameBn: '',
  method: null,
  photo: null,
  photoUrl: null,
  ingredients: [],
  finishedGrams: null,
  servings: 1,
  step: 0,
});

/** The key for a new recipe's draft; an edit uses the recipe id. */
export const NEW_DRAFT = 'new';

type DraftsState = {
  drafts: Record<string, RecipeDraft>;
  save: (key: string, draft: RecipeDraft) => void;
  discard: (key: string) => void;
  clear: () => void;
};

/** One draft per recipe being edited (plus one for a new recipe). Cleared on sign-out. */
export const useRecipeDrafts = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      save: (key, draft) => set((s) => ({ drafts: { ...s.drafts, [key]: draft } })),
      discard: (key) =>
        set((s) => {
          const { [key]: _removed, ...rest } = s.drafts;
          return { drafts: rest };
        }),
      clear: () => set({ drafts: {} }),
    }),
    {
      name: 'aurora.food.recipe-drafts',
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: kv.get,
        setItem: kv.set,
        removeItem: kv.remove,
      })),
      partialize: ({ drafts }) => ({ drafts }),
    },
  ),
);
