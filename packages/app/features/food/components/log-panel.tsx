'use client';

import {
  type FoodItem,
  OIL_TIERS,
  type OilTier,
  type PortionNutrients,
  type RecipeAnswers,
  type RecipeQuestion,
  servingGrams,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Check, ChevronLeft, cn, Icon, Text, WifiOff } from '@mybela/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { ModeSwitch } from '../../../components/mode-switch';
import { SheetScrollView } from '../../../components/sheet';
import { Skeleton } from '../../../components/skeleton';
import { ValueSlider } from '../../../components/value-slider';
import { useAppDimensions } from '../../../lib/dimensions';
import { successHaptic } from '../../../lib/haptics';
import { useInsets } from '../../../lib/insets';
import { useLanguage } from '../../../lib/language';
import { useIsOnline } from '../../../lib/use-online';
import { useSession } from '../../auth/session';
import { foodNames } from '../display';
import {
  currentMealSlot,
  FOOD_LOG,
  type FoodLog,
  type FoodLogVars,
  loggedAtFor,
  MEAL_SLOTS,
  type MealSlot,
  usePortionEstimate,
  useRecipe,
} from '../log-queries';

const MACROS = ['protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;
/** Room kept under the scrolling form for the pinned Save button. */
const FOOTER_HEIGHT = 88;

/** Slider bounds around one serving: a quarter to three servings, on a 5 or 10 g grid. */
function portionRange(serving: number) {
  const step = serving <= 100 ? 5 : 10;
  const min = Math.max(step, Math.round((serving * 0.25) / step) * step);
  const max = Math.max(min + step, Math.round((serving * 3) / step) * step);
  return { step, min, max };
}

const fmt = (value: number | null | undefined, digits = 0) =>
  value == null
    ? null
    : value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/**
 * F6: logging one food. Meal, portion and cooking oil, the recipe's own questions (if it has any),
 * and the backend's estimate for exactly that, refreshed as things change. Saving is a keyed
 * offline-safe write: it shows as saved on the device at once and syncs when it can.
 */
export function LogPanel({
  item,
  onBack,
  onDone,
}: {
  item: FoodItem;
  onBack: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useInsets();
  const { height } = useAppDimensions();
  const online = useIsOnline();
  const userId = useSession()?.user.id;
  const queryClient = useQueryClient();
  const recipe = useRecipe(item).data;
  const questions = recipe.questions;

  const serving = servingGrams(item);
  const range = useMemo(() => portionRange(serving), [serving]);
  const [slot, setSlot] = useState<MealSlot>(() => currentMealSlot());
  const [grams, setGrams] = useState(serving);
  const [oil, setOil] = useState<OilTier>('typical');
  const [answers, setAnswers] = useState<RecipeAnswers>({});

  // Only answers to the current questions are sent (a refresh may have changed them).
  const sentAnswers = useMemo(() => {
    const out: RecipeAnswers = {};
    for (const question of questions) {
      const answer = answers[question.id];
      if (answer && question.choices.some((choice) => choice.value === answer)) {
        out[question.id] = answer;
      }
    }
    return out;
  }, [questions, answers]);
  const complete = questions.every((q) => !q.required || sentAnswers[q.id] !== undefined);
  const estimate = usePortionEstimate({
    recipeId: item.id,
    grams,
    answers: sentAnswers,
    complete,
  });

  const mutation = useMutation<FoodLog, Error, FoodLogVars>({ mutationKey: FOOD_LOG });
  const lastVars = useRef<FoodLogVars | null>(null);

  const save = () => {
    if (!userId || !complete) return;
    // A retry replaces the failed attempt rather than leaving it behind in the failed-logs banner.
    const previous = lastVars.current;
    if (mutation.isError && previous) {
      const cache = queryClient.getMutationCache();
      for (const m of cache.findAll({ mutationKey: FOOD_LOG, status: 'error' })) {
        if (m.state.variables === previous) cache.remove(m);
      }
    }
    const vars: FoodLogVars = {
      userId,
      recipe_id: item.id,
      grams,
      oil_tier: oil,
      logged_at: loggedAtFor(slot),
      answers: sentAnswers,
    };
    lastVars.current = vars;
    successHaptic();
    mutation.mutate(vars);
  };

  const { primary } = foodNames(item, language);
  const scrollMax = height * 0.92 - FOOTER_HEIGHT - Math.max(insets.bottom, 12);

  if (mutation.isSuccess || mutation.isPaused) {
    return (
      <LogSaved
        name={primary}
        grams={lastVars.current?.grams ?? grams}
        kcal={mutation.data?.nutrients.kcal ?? null}
        queued={!mutation.isSuccess}
        bottom={Math.max(insets.bottom, 16) + 12}
        onDone={onDone}
      />
    );
  }

  const setAnswer = (question: RecipeQuestion, value: string) =>
    setAnswers((current) => {
      // Optional questions can be cleared by tapping the chosen answer again.
      if (!question.required && current[question.id] === value) {
        const { [question.id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [question.id]: value };
    });

  return (
    <View>
      <SheetScrollView
        style={{ maxHeight: scrollMax }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2 px-3 pb-2 pt-3 pr-14">
          <Pressable
            onPress={onBack}
            role="button"
            aria-label={t('food.log.back')}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          >
            <Icon as={ChevronLeft} size={22} className="text-foreground" />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              {t('food.log.title')}
            </Text>
            <Text role="heading" aria-level={2} numberOfLines={1} className="text-lg font-bold">
              {primary}
            </Text>
          </View>
        </View>

        <View className="gap-7 px-5 pt-3">
          <Section label={t('food.log.meal')}>
            <ModeSwitch
              value={slot}
              onChange={setSlot}
              options={MEAL_SLOTS.map((value) => ({ value, label: t(`food.log.meals.${value}`) }))}
            />
          </Section>

          <Section label={t('food.log.portion')}>
            <ValueSlider
              size="sm"
              label={t('food.log.portion')}
              value={grams}
              min={range.min}
              max={range.max}
              step={range.step}
              onChange={setGrams}
              format={(value) => t('food.detail.grams', { grams: fmt(value) })}
            />
            <Text className="text-muted-foreground text-center text-sm">
              {t('food.log.servings', { count: Math.round((grams / serving) * 10) / 10 })}
            </Text>
          </Section>

          <Section label={t('food.log.oil')}>
            <ModeSwitch
              value={oil}
              onChange={setOil}
              options={OIL_TIERS.map((value) => ({
                value,
                label: t(`food.log.oilTiers.${value}`),
              }))}
            />
          </Section>

          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              value={sentAnswers[question.id]}
              onChange={(value) => setAnswer(question, value)}
            />
          ))}

          <Estimate
            state={estimate.state}
            nutrients={estimate.nutrients}
            refreshing={estimate.isFetching}
            onRetry={() => void estimate.refetch()}
          />
        </View>
      </SheetScrollView>

      <View
        className="border-border bg-card gap-2 border-t px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {mutation.isError ? (
          <Text role="alert" className="text-destructive text-center text-sm">
            {t('food.log.saveFailed')}
          </Text>
        ) : !online ? (
          <View className="flex-row items-center justify-center gap-2">
            <Icon as={WifiOff} size={14} className="text-muted-foreground" />
            <Text className="text-muted-foreground text-sm">{t('food.log.offlineSave')}</Text>
          </View>
        ) : null}
        <Button
          size="lg"
          className="rounded-full"
          disabled={!complete || !userId || mutation.isPending}
          onPress={save}
        >
          <Text>
            {mutation.isError
              ? t('common.retry')
              : complete
                ? t('food.log.save')
                : t('food.log.answerFirst')}
          </Text>
        </Button>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** One recipe question: its prompt and a vertical list of single-choice answers, as returned. */
function QuestionCard({
  question,
  value,
  onChange,
}: {
  question: RecipeQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-background gap-3 rounded-2xl p-4">
      <View className="gap-0.5">
        <Text className="text-base font-semibold leading-6">{question.prompt}</Text>
        <Text className="text-muted-foreground text-xs">
          {question.required ? t('food.log.required') : t('food.log.optional')}
        </Text>
      </View>
      <View role="radiogroup" aria-label={question.prompt} className="gap-2">
        {question.choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={choice.value}
              role="radio"
              aria-checked={selected}
              onPress={() => onChange(choice.value)}
              className={cn(
                'min-h-12 flex-row items-center gap-3 rounded-xl border px-3.5 py-3 active:opacity-80',
                selected ? 'border-primary bg-primary/10' : 'border-border bg-card',
              )}
            >
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                )}
              >
                {selected ? (
                  <Icon as={Check} size={12} strokeWidth={3} className="text-primary-foreground" />
                ) : null}
              </View>
              <Text className="flex-1 text-sm leading-5">{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The backend's figures for this exact portion and answers, displayed as returned. */
function Estimate({
  state,
  nutrients,
  refreshing,
  onRetry,
}: {
  state: ReturnType<typeof usePortionEstimate>['state'];
  nutrients: PortionNutrients | undefined;
  refreshing: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-sage/10 gap-3 rounded-2xl p-4" aria-live="polite">
      <View className="flex-row items-center justify-between">
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {t('food.log.estimate')}
        </Text>
        {refreshing && state === 'ready' ? <ActivityIndicator size="small" /> : null}
      </View>
      {state === 'ready' && nutrients ? (
        <>
          <Text className="text-3xl font-bold tracking-tight">
            {nutrients.kcal != null
              ? t('food.log.kcal', { kcal: fmt(nutrients.kcal) })
              : t('food.detail.unknown')}
          </Text>
          <View className="flex-row gap-2">
            {MACROS.filter((key) => nutrients[key] != null).map((key) => (
              <View key={key} className="bg-card flex-1 items-center gap-0.5 rounded-xl py-2.5">
                <Text className="text-sm font-bold">
                  {t('food.detail.grams', { grams: fmt(nutrients[key], 1) })}
                </Text>
                <Text className="text-muted-foreground text-xs">{t(`food.detail.${key}`)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : state === 'loading' ? (
        <View className="gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-12 rounded-xl" />
        </View>
      ) : state === 'error' ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-muted-foreground flex-1 text-sm leading-5">
            {t('food.log.estimateFailed')}
          </Text>
          <Button variant="outline" size="sm" className="rounded-full" onPress={onRetry}>
            <Text>{t('common.retry')}</Text>
          </Button>
        </View>
      ) : (
        <Text className="text-muted-foreground text-sm leading-5">
          {state === 'offline' ? t('food.log.estimateOffline') : t('food.log.estimateNeedsAnswers')}
        </Text>
      )}
    </View>
  );
}

/** Shown right after Save: saved (with the backend's kcal) or saved on the device, syncing later. */
function LogSaved({
  name,
  grams,
  kcal,
  queued,
  bottom,
  onDone,
}: {
  name: string;
  grams: number;
  kcal: number | null;
  queued: boolean;
  bottom: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  return (
    <FadeIn className="items-center gap-5 px-6 pt-10" style={{ paddingBottom: bottom }}>
      <View className="bg-primary/15 h-16 w-16 items-center justify-center rounded-full">
        <Icon as={queued ? WifiOff : Check} size={30} className="text-primary" />
      </View>
      <View className="items-center gap-1.5">
        <Text role="heading" aria-level={2} className="text-center text-xl font-bold">
          {queued ? t('food.log.queuedTitle') : t('food.log.savedTitle')}
        </Text>
        <Text className="text-muted-foreground text-center leading-6">
          {kcal != null
            ? t('food.log.savedBodyKcal', {
                name,
                grams: fmt(grams),
                kcal: fmt(kcal),
              })
            : t('food.log.savedBody', { name, grams: fmt(grams) })}
        </Text>
        {queued ? (
          <Text className="text-muted-foreground text-center text-sm leading-5">
            {t('food.log.queuedBody')}
          </Text>
        ) : null}
      </View>
      <Button size="lg" className="w-full rounded-full" onPress={onDone}>
        <Text>{t('food.log.done')}</Text>
      </Button>
    </FadeIn>
  );
}
