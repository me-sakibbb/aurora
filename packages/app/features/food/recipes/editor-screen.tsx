'use client';

import {
  ApiError,
  type CustomRecipeInput,
  classifyRecipeError,
  needsAddedWater,
  type RecipeDetail,
  type RecipeSaveIssue,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, cn, Icon, Text, TriangleAlert } from '@mybela/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { Skeleton } from '../../../components/skeleton';
import { tapHaptic } from '../../../lib/haptics';
import { useInsets } from '../../../lib/insets';
import { useSearchParam } from '../../../lib/navigation';
import { useIsOnline } from '../../../lib/use-online';
import { InlineState } from '../../home/components/primitives';
import { AppTopBar } from '../../shell/top-bar';
import { methodLabel } from '../display';
import { isCookingMethod } from '../method-icons';
import { photoAvailable } from '../photo';
import { emptyDraft, NEW_DRAFT, type RecipeDraft, useRecipeDrafts } from './draft-store';
import { useRecipeDetail, useSaveRecipe, useUploadPhoto } from './queries';
import { SavedPanel } from './saved-panel';
import { BasicsStep } from './steps/basics-step';
import { IngredientsStep, rawTotal } from './steps/ingredients-step';
import { ReviewStep } from './steps/review-step';
import { WeightStep } from './steps/weight-step';

const STEPS = ['basics', 'ingredients', 'weight', 'review'] as const;
const LAST = STEPS.length - 1;

/** The editor's starting point for an own recipe: what it has now. */
function draftFromRecipe(recipe: RecipeDetail): RecipeDraft {
  return {
    ...emptyDraft(),
    name: recipe.name,
    nameBn: recipe.name_bn ?? '',
    method: isCookingMethod(recipe.cooking_method) ? recipe.cooking_method : 'other',
    photoUrl: recipe.thumbnail_url,
    ingredients: recipe.ingredients.map((row) => ({
      food_id: row.food_id,
      name_en: row.name_en,
      name_bn: row.name_bn,
      image_url: row.image_url,
      grams: row.edible_g,
    })),
    finishedGrams: recipe.weight_g ?? null,
    servings: recipe.servings ?? 1,
  };
}

function stepValid(step: number, draft: RecipeDraft) {
  switch (STEPS[step]) {
    case 'basics':
      return draft.name.trim().length > 0 && draft.method !== null;
    case 'ingredients':
      return (
        draft.ingredients.length > 0 &&
        draft.ingredients.every((row) => Boolean(row.grams)) &&
        !needsAddedWater(draft.method, draft.ingredients)
      );
    case 'weight':
      return Boolean(draft.finishedGrams) && draft.servings >= 1;
    default:
      return true;
  }
}

/**
 * A2 custom recipes: create a recipe (`/food/recipe`) or edit an own one (`/food/recipe?id=`).
 * Four short steps; what's typed is kept on the device until it's saved. The backend works out
 * the nutrition, so saving is online only.
 */
export function RecipeEditorScreen() {
  const { t } = useTranslation();
  const id = useSearchParam('id');
  const online = useIsOnline();
  const detail = useRecipeDetail(id);

  if (id && !detail.data) {
    return (
      <View className="bg-background flex-1">
        <AppTopBar back />
        <View className="mx-auto w-full max-w-lg gap-4 px-5 pt-4">
          {detail.isError || !online ? (
            <>
              <Text className="text-muted-foreground text-center">
                {t('food.recipes.loadFailed')}
              </Text>
              <InlineState
                kind={online ? undefined : 'offline'}
                error={detail.error}
                onRetry={() => detail.refetch()}
              />
            </>
          ) : (
            <View aria-busy className="gap-4">
              <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </View>
          )}
        </View>
      </View>
    );
  }
  return <Editor key={id ?? NEW_DRAFT} id={id} recipe={detail.data} />;
}

function Editor({ id, recipe }: { id: string | undefined; recipe: RecipeDetail | undefined }) {
  const { t } = useTranslation();
  const insets = useInsets();
  const online = useIsOnline();
  const draftKey = id ?? NEW_DRAFT;
  const saveDraft = useRecipeDrafts((s) => s.save);
  const discardDraft = useRecipeDrafts((s) => s.discard);
  const [draft, setDraft] = useState<RecipeDraft>(
    () =>
      useRecipeDrafts.getState().drafts[draftKey] ??
      (recipe ? draftFromRecipe(recipe) : emptyDraft()),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<RecipeDetail | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [photoError, setPhotoError] = useState<'failed' | 'tooLarge' | null>(null);
  const [issue, setIssue] = useState<RecipeSaveIssue | null>(null);
  const upload = useUploadPhoto();
  const save = useSaveRecipe();
  const scrollRef = useRef<ScrollView>(null);
  const endReached = useRef<(() => void) | null>(null);
  const step = Math.min(draft.step, LAST);

  // Keep the draft on the device as it changes, until it's saved.
  useEffect(() => {
    if (!saved) saveDraft(draftKey, draft);
  }, [draft, draftKey, saveDraft, saved]);

  // A photo picked last time may be gone (web object URLs, a cleared native cache).
  const firstPhoto = useRef(draft.photo);
  useEffect(() => {
    const photo = firstPhoto.current;
    if (!photo) return;
    void photoAvailable(photo.uri).then((available) => {
      if (available) return;
      setDraft((current) =>
        current.photo?.uri === photo.uri ? { ...current, photo: null } : current,
      );
      setPhotoNotice(t('food.recipes.photo.lost'));
    });
  }, [t]);

  const update = useCallback((patch: Partial<RecipeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setIssue(null);
    setPhotoError(null);
  }, []);

  const goTo = (next: number) => {
    setShowErrors(false);
    setDraft((current) => ({ ...current, step: next }));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    tapHaptic();
    if (!stepValid(step, draft)) {
      setShowErrors(true);
      return;
    }
    goTo(step + 1);
  };

  const registerEndReached = useCallback((handler: (() => void) | null) => {
    endReached.current = handler;
  }, []);

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 240) {
      endReached.current?.();
    }
  };

  /** Opens a step with its problems highlighted. */
  const showProblem = (index: number) => {
    goTo(index);
    setShowErrors(true);
  };

  const submit = async ({ withoutPhoto = false }: { withoutPhoto?: boolean } = {}) => {
    if (!online || phase !== 'idle') return;
    setIssue(null);
    setPhotoError(null);
    // Anything a step can catch is shown there, before talking to the backend.
    const invalid = STEPS.findIndex((_, index) => index < LAST && !stepValid(index, draft));
    if (invalid !== -1) {
      showProblem(invalid);
      return;
    }
    let url = draft.photoUrl;
    if (draft.photo && !withoutPhoto) {
      setPhase('uploading');
      try {
        url = await upload.mutateAsync(draft.photo);
        // Kept, so a save that fails next doesn't upload the same photo again.
        setDraft((current) => ({ ...current, photo: null, photoUrl: url }));
      } catch (error) {
        setPhase('idle');
        setPhotoError(error instanceof ApiError && error.status === 413 ? 'tooLarge' : 'failed');
        return;
      }
    }
    const raw = rawTotal(draft.ingredients);
    const input: CustomRecipeInput = {
      name: draft.name.trim(),
      name_bn: draft.nameBn.trim() || null,
      cooking_method: draft.method ?? 'other',
      thumbnail_url: url,
      servings: draft.servings,
      // The weight the person entered over the raw total; the backend does the rest.
      yield_factor: Math.round(((draft.finishedGrams ?? raw) / raw) * 1000) / 1000,
      ingredients: draft.ingredients.map((row) => ({
        food_id: row.food_id,
        edible_g: row.grams ?? 0,
      })),
    };
    setPhase('saving');
    try {
      const result = await save.mutateAsync({ id, input });
      discardDraft(draftKey);
      setSaved(result);
    } catch (error) {
      const found = classifyRecipeError(error);
      setIssue(found);
      // Send the person to the step that can fix it, with the reason on top.
      if (found.step) showProblem(STEPS.indexOf(found.step));
    } finally {
      setPhase('idle');
    }
  };

  if (saved) return <SavedPanel recipe={saved} edited={Boolean(id)} />;

  const busy = phase !== 'idle';
  const issueText = issue
    ? t(`food.recipes.errors.${issue.kind}`, {
        method: methodLabel(t, draft.method),
        detail: issue.kind === 'invalid' ? issue.detail : '',
      })
    : null;
  // A problem a step can fix is shown on that step; the rest above the Save button.
  const stepIssue = issue?.step && STEPS[step] === issue.step ? issueText : null;
  const startedNew = !id && (draft.name.trim() || draft.ingredients.length > 0 || draft.photo);

  let body: React.ReactNode;
  switch (STEPS[step]) {
    case 'basics':
      body = (
        <BasicsStep
          draft={draft}
          update={update}
          photoNotice={photoNotice}
          showErrors={showErrors}
        />
      );
      break;
    case 'ingredients':
      body = (
        <IngredientsStep
          draft={draft}
          update={update}
          showErrors={showErrors}
          registerEndReached={registerEndReached}
        />
      );
      break;
    case 'weight':
      body = <WeightStep draft={draft} update={update} showErrors={showErrors} />;
      break;
    default:
      body = <ReviewStep draft={draft} editing={Boolean(id)} onEdit={goTo} />;
  }

  return (
    <View className="bg-background flex-1">
      <AppTopBar back />
      <View className="mx-auto w-full max-w-lg gap-2 px-5 pb-1 pt-3">
        <View className="flex-row gap-1.5" aria-hidden>
          {STEPS.map((name, index) => (
            <View
              key={name}
              className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            {t('food.recipes.stepOf', { step: step + 1, total: STEPS.length })} ·{' '}
            {t(`food.recipes.steps.${STEPS[step]}`)}
          </Text>
          {step === 0 && startedNew ? (
            <Pressable
              onPress={() => {
                discardDraft(draftKey);
                setPhotoNotice(null);
                setDraft(emptyDraft());
              }}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Text className="text-muted-foreground text-xs font-semibold">
                {t('food.recipes.startOver')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-lg px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={100}
      >
        {stepIssue ? (
          <FadeIn className="bg-destructive/10 mb-5 flex-row gap-3 rounded-2xl px-4 py-3">
            <Icon as={TriangleAlert} size={18} className="text-destructive mt-0.5" />
            <Text className="text-destructive flex-1 text-sm leading-5" role="alert">
              {stepIssue}
            </Text>
          </FadeIn>
        ) : null}
        <FadeIn key={step}>{body}</FadeIn>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="bg-background border-border border-t px-5 pt-3"
      >
        <View className="mx-auto w-full max-w-lg gap-2">
          {step === LAST ? (
            <SaveStatus
              online={online}
              phase={phase}
              photoError={photoError}
              message={issue && !issue.step ? issueText : null}
              onSaveWithout={() => submit({ withoutPhoto: true })}
              onRetry={() => submit()}
            />
          ) : null}
          <View className="flex-row gap-3">
            {step > 0 ? (
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-6"
                disabled={busy}
                onPress={() => goTo(step - 1)}
              >
                <Text>{t('food.recipes.back')}</Text>
              </Button>
            ) : null}
            {step < LAST ? (
              <Button size="lg" className="flex-1 rounded-full" onPress={next}>
                <Text>{t('food.recipes.next')}</Text>
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 rounded-full"
                disabled={!online || busy}
                onPress={() => submit()}
              >
                {busy ? <ActivityIndicator className="text-primary-foreground" /> : null}
                <Text>
                  {phase === 'uploading'
                    ? t('food.recipes.uploading')
                    : phase === 'saving'
                      ? t('food.recipes.saving')
                      : id
                        ? t('food.recipes.saveChanges')
                        : t('food.recipes.save')}
                </Text>
              </Button>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/** What's in the way of saving, above the Save button. */
function SaveStatus({
  online,
  phase,
  photoError,
  message,
  onSaveWithout,
  onRetry,
}: {
  online: boolean;
  phase: 'idle' | 'uploading' | 'saving';
  photoError: 'failed' | 'tooLarge' | null;
  /** Why the save failed, when no step can fix it. */
  message: string | null;
  onSaveWithout: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (!online) {
    return (
      <Text className="text-muted-foreground text-center text-sm" role="status">
        {t('food.recipes.review.offline')}
      </Text>
    );
  }
  if (phase !== 'idle') return null;
  if (photoError) {
    return (
      <FadeIn className="bg-destructive/10 gap-3 rounded-2xl px-4 py-3">
        <Text className="text-destructive text-sm font-medium" role="alert">
          {photoError === 'tooLarge'
            ? t('food.recipes.errors.photoTooLarge')
            : t('food.recipes.review.photoFailed')}
        </Text>
        <View className="flex-row gap-2">
          <Button size="sm" variant="outline" className="flex-1 rounded-full" onPress={onRetry}>
            <Text>{t('food.recipes.review.retry')}</Text>
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 rounded-full" onPress={onSaveWithout}>
            <Text>{t('food.recipes.review.saveWithout')}</Text>
          </Button>
        </View>
      </FadeIn>
    );
  }
  if (message) {
    return (
      <FadeIn className="bg-destructive/10 flex-row gap-3 rounded-2xl px-4 py-3">
        <Icon as={TriangleAlert} size={18} className="text-destructive mt-0.5" />
        <Text className="text-destructive flex-1 text-sm leading-5" role="alert">
          {message}
        </Text>
      </FadeIn>
    );
  }
  return null;
}
