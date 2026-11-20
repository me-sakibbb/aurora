'use client';

import {
  type CustomRecipeInput,
  createCustomRecipe,
  deleteCustomRecipe,
  fetchRecipeDetail,
  INGREDIENT_BROWSE_LIMIT,
  isAddedWater,
  isApiConfigured,
  PHOTO_FILENAME,
  type PickedPhoto,
  RECIPE_PHOTO_BUCKET,
  type RecipeDetail,
  searchIngredients,
  updateCustomRecipe,
  uploadFile,
} from '@mybela/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { uploadPart } from '../photo';
import { foodCatalogueQueryKey, useDebounced, useRecentFoods } from '../queries';

// ─── Reads ───────────────────────────────────────────────────────────────────────────────────────

const INGREDIENT_MIN_QUERY = 2;
const INGREDIENT_PAGE = 20;

/**
 * Ingredients to pick from, a page at a time on the device: every ingredient (A–Z) with an empty
 * box, the backend's matches once two letters are typed (debounced), and the browse list filtered
 * on the device for a single letter.
 */
export function useIngredientSearch(query: string) {
  const text = query.trim();
  const debounced = useDebounced(text, 250);
  const searching = debounced.length >= INGREDIENT_MIN_QUERY;
  const browse = useQuery({
    queryKey: ['food', 'ingredients', 'browse'],
    queryFn: ({ signal }) => searchIngredients('', signal, INGREDIENT_BROWSE_LIMIT),
    enabled: isApiConfigured(),
    staleTime: 60 * 60_000,
    retry: 1,
  });
  const search = useQuery({
    queryKey: ['food', 'ingredients', debounced.toLowerCase()],
    queryFn: ({ signal }) => searchIngredients(debounced, signal),
    enabled: searching && isApiConfigured(),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const active = searching ? search : browse;
  const all = useMemo(() => {
    if (searching) return search.data ?? [];
    const list = browse.data ?? [];
    const letter = debounced.toLowerCase();
    return letter
      ? list.filter(
          (item) =>
            item.name_en.toLowerCase().startsWith(letter) ||
            (item.name_bn ?? '').startsWith(debounced),
        )
      : list;
  }, [searching, search.data, browse.data, debounced]);
  const [shown, setShown] = useState({ key: debounced, size: INGREDIENT_PAGE });
  const size = shown.key === debounced ? shown.size : INGREDIENT_PAGE;
  return {
    items: all.slice(0, size),
    hasMore: size < all.length,
    loadMore: () => setShown({ key: debounced, size: size + INGREDIENT_PAGE }),
    /** Matching what's typed (vs. browsing every ingredient). */
    searching: text.length > 0,
    /** Typing, or the backend hasn't answered yet. */
    waiting: text !== debounced || (active.data === undefined && active.isPending),
    failed: active.data === undefined && active.isError,
    error: active.error,
    retry: () => void active.refetch(),
  };
}

/** The "Water (Added)" ingredient, looked up only when a recipe needs it. */
export function useAddedWater(enabled: boolean) {
  return useQuery({
    queryKey: ['food', 'ingredients', 'added-water'],
    queryFn: async ({ signal }) => {
      const matches = await searchIngredients('water', signal);
      return (
        matches.find((item) => item.name_en.trim().toLowerCase() === 'water (added)') ??
        matches.find((item) => isAddedWater(item.name_en)) ??
        null
      );
    },
    enabled: enabled && isApiConfigured(),
    staleTime: 24 * 60 * 60_000,
  });
}

export const recipeDetailQueryKey = (id: string) => ['food', 'recipe-detail', id];

/** An own recipe with its ingredients, to edit it. */
export function useRecipeDetail(id: string | undefined) {
  return useQuery({
    queryKey: recipeDetailQueryKey(id ?? ''),
    queryFn: ({ signal }) => fetchRecipeDetail(id as string, signal),
    enabled: Boolean(id) && isApiConfigured(),
    staleTime: 60_000,
  });
}

// ─── Writes (online only: the backend works out the nutrition) ──────────────────────────────────

/** Uploads a compressed photo and returns its URL. */
export function useUploadPhoto() {
  return useMutation({
    mutationFn: async (photo: PickedPhoto) =>
      uploadFile({
        bucket: RECIPE_PHOTO_BUCKET,
        file: await uploadPart(photo),
        filename: PHOTO_FILENAME,
      }),
  });
}

/** Every cached list or copy a recipe can appear in. */
function useRefreshRecipes() {
  const queryClient = useQueryClient();
  return (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: foodCatalogueQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['food', 'pages'] }),
      queryClient.invalidateQueries({ queryKey: ['food', 'recipe', id] }),
      queryClient.invalidateQueries({ queryKey: recipeDetailQueryKey(id) }),
    ]);
}

/** Creates (no `id`) or replaces an own recipe. Resolves to the saved recipe with its nutrition. */
export function useSaveRecipe() {
  const refresh = useRefreshRecipes();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CustomRecipeInput }) =>
      id ? updateCustomRecipe(id, input) : createCustomRecipe(input),
    onSuccess: (saved: RecipeDetail) => {
      queryClient.setQueryData(recipeDetailQueryKey(saved.id), saved);
      // A recently viewed copy would show the old name or photo.
      useRecentFoods.getState().replace(saved);
      void refresh(saved.id);
    },
  });
}

/** Deletes an own recipe. A 409 means it's in the food log, so it stays. */
export function useDeleteRecipe() {
  const refresh = useRefreshRecipes();
  return useMutation({
    mutationFn: (id: string) => deleteCustomRecipe(id),
    onSuccess: (_data, id) => {
      useRecentFoods.getState().remove(id);
      void refresh(id);
    },
  });
}
