'use client';

import {
  ApiError,
  errorKind,
  type FoodItem,
  fetchRecipe,
  identifyMealPhoto,
  type MealPhotoCandidate,
  type MealPhotoMatch,
  mealPhotoSessionId,
  PhotoProblem,
  type PhotoSource,
  type PickedPhoto,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import {
  Button,
  Camera,
  ChevronLeft,
  Icon,
  ImagePlus,
  Input,
  RefreshCw,
  Search,
  Sparkles,
  Text,
  WifiOff,
  X,
} from '@mybela/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { FoodImage } from '../../../components/food-image';
import { Sheet, SheetScrollView } from '../../../components/sheet';
import { useAppDimensions } from '../../../lib/dimensions';
import { tapHaptic } from '../../../lib/haptics';
import { useInsets } from '../../../lib/insets';
import { useIsOnline } from '../../../lib/use-online';
import { LogPanel } from '../components/log-panel';
import { compressPhoto, pickPhoto, uploadPart } from '../photo';
import { useRecentFoods } from '../queries';
import { AltMatch, recipeQueryKey, TopMatch } from './match-card';
import { ScanOverlay } from './scan-overlay';

type Phase = 'source' | 'analyzing' | 'matched' | 'retry' | 'log' | 'error';

/** Why a match failed, for the message and which ways out make sense. */
type Problem = 'offline' | 'server' | 'tooLarge' | 'badPhoto' | 'denied' | 'photoFailed';

/** When the waiting line changes (ms), so a slow answer still feels alive. */
const SLOW_AFTER = 6_000;
const VERY_SLOW_AFTER = 15_000;
const HINT_MAX = 500;

function problemOf(error: unknown, online: boolean): Problem {
  if (error instanceof PhotoProblem) {
    return error.reason === 'denied'
      ? 'denied'
      : error.reason === 'tooLarge'
        ? 'tooLarge'
        : 'photoFailed';
  }
  if (error instanceof ApiError) {
    if (error.status === 413) return 'tooLarge';
    if (error.status === 422) return 'badPhoto';
  }
  return errorKind(error, online) === 'offline' ? 'offline' : 'server';
}

/**
 * Snap a meal: a photo of the plate → the backend matches it to catalogue dishes → the person
 * confirms the best match (or picks another, or gives a hint and tries again) → the usual log form,
 * with the photo's session attached so the backend can pair the two. One sheet, step by step.
 */
export function SnapSheet({
  open,
  onClose,
  onSearchInstead,
}: {
  open: boolean;
  onClose: () => void;
  /** "Search instead": the host closes this and takes the person to food search. */
  onSearchInstead: () => void;
}) {
  const { t } = useTranslation();
  const insets = useInsets();
  const { width, height } = useAppDimensions();
  const online = useIsOnline();
  const queryClient = useQueryClient();
  const addRecent = useRecentFoods((s) => s.add);

  const [phase, setPhase] = useState<Phase>('source');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [match, setMatch] = useState<MealPhotoMatch | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [hint, setHint] = useState('');
  const [chosen, setChosen] = useState<FoodItem | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const [slow, setSlow] = useState(0);
  // The photo session spans every retry (retake or hint) until a log uses it.
  const session = useRef<string | null>(null);
  const run = useRef(0);
  const abort = useRef<AbortController | null>(null);

  // Every opening starts fresh.
  useEffect(() => {
    if (!open) return;
    run.current += 1;
    session.current = null;
    setPhase('source');
    setPhoto(null);
    setMatch(null);
    setProblem(null);
    setHint('');
    setChosen(null);
    setOpening(null);
    setOpenFailed(false);
  }, [open]);

  // Closing mid-match drops the request.
  useEffect(() => {
    if (!open) abort.current?.abort();
  }, [open]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    setSlow(0);
    const timers = [
      setTimeout(() => setSlow(1), SLOW_AFTER),
      setTimeout(() => setSlow(2), VERY_SLOW_AFTER),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const identify = async (picked: PickedPhoto, description?: string) => {
    const id = ++run.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase('analyzing');
    setProblem(null);
    try {
      const result = await identifyMealPhoto({
        file: await uploadPart(picked),
        sessionId: session.current,
        description,
        signal: controller.signal,
      });
      if (id !== run.current) return;
      session.current = result.image_session_id;
      setMatch(result);
      tapHaptic();
      setPhase(result.candidates.length > 0 ? 'matched' : 'retry');
    } catch (error) {
      if (id !== run.current || controller.signal.aborted) return;
      // 404/409: the session is gone or already logged, so the next try starts a new one.
      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        session.current = null;
      } else {
        session.current = mealPhotoSessionId(error) ?? session.current;
      }
      setProblem(problemOf(error, online));
      setPhase('error');
    }
  };

  const choose = async (source: PhotoSource) => {
    // Called straight from the tap, so the web file picker is allowed to open.
    let picked: PickedPhoto | null;
    try {
      picked = await pickPhoto(source, { crop: false });
    } catch (error) {
      setProblem(problemOf(error, online));
      setPhase('error');
      return;
    }
    if (!picked) return;
    const id = ++run.current;
    setMatch(null);
    setHint('');
    setPhoto(picked);
    setPhase('analyzing');
    try {
      const compressed = await compressPhoto(picked);
      if (id !== run.current) return;
      setPhoto(compressed);
      await identify(compressed);
    } catch (error) {
      if (id !== run.current) return;
      setProblem(problemOf(error, online));
      setPhase('error');
    }
  };

  const cancel = () => {
    run.current += 1;
    abort.current?.abort();
    setPhase('source');
  };

  /** Opens the log form for a match, once its full recipe (serving, questions) is here. */
  const logMatch = async (candidate: MealPhotoCandidate) => {
    tapHaptic();
    setOpening(candidate.recipe_id);
    setOpenFailed(false);
    try {
      const item = await queryClient.fetchQuery({
        queryKey: recipeQueryKey(candidate.recipe_id),
        queryFn: ({ signal }) => fetchRecipe(candidate.recipe_id, signal),
        staleTime: 5 * 60_000,
      });
      addRecent(item);
      setChosen(item);
      setPhase('log');
    } catch {
      setOpenFailed(true);
    } finally {
      setOpening(null);
    }
  };

  const heroHeight = Math.min(Math.round(width * 0.62), height * 0.34);
  const bottom = Math.max(insets.bottom, 16) + 12;
  const [top, ...others] = match?.candidates ?? [];

  let body: React.ReactNode;
  if (phase === 'log' && chosen && session.current) {
    body = (
      <LogPanel
        key={chosen.id}
        item={chosen}
        imageSessionId={session.current}
        onBack={() => setPhase('matched')}
        onDone={onClose}
      />
    );
  } else if (phase === 'source') {
    body = (
      <FadeIn className="gap-5 px-5 pt-8" style={{ paddingBottom: bottom }}>
        <View className="gap-1.5 pr-10">
          <Text role="heading" aria-level={2} className="text-2xl font-bold tracking-tight">
            {t('food.snap.title')}
          </Text>
          <Text className="text-muted-foreground leading-6">{t('food.snap.subtitle')}</Text>
        </View>
        {online ? (
          <View className="gap-2">
            <SourceRow
              icon={Camera}
              label={t('food.snap.camera')}
              onPress={() => choose('camera')}
            />
            <SourceRow
              icon={ImagePlus}
              label={t('food.snap.library')}
              onPress={() => choose('library')}
            />
          </View>
        ) : (
          <View className="bg-muted gap-3 rounded-2xl p-4">
            <View className="flex-row items-center gap-2.5">
              <Icon as={WifiOff} size={18} className="text-muted-foreground" />
              <Text className="flex-1 font-semibold">{t('food.snap.offlineTitle')}</Text>
            </View>
            <Text className="text-muted-foreground text-sm leading-5">
              {t('food.snap.offlineBody')}
            </Text>
            <Button variant="outline" className="rounded-full" onPress={onSearchInstead}>
              <Icon as={Search} size={16} className="text-foreground" />
              <Text>{t('food.snap.search')}</Text>
            </Button>
          </View>
        )}
      </FadeIn>
    );
  } else {
    body = (
      <SheetScrollView
        style={{ maxHeight: height * 0.92 }}
        contentContainerStyle={{ paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: heroHeight }} className="bg-sage/20 w-full overflow-hidden">
          {photo ? (
            <FoodImage uri={photo.uri} className="absolute inset-0" fallback={null} />
          ) : null}
          {phase === 'analyzing' ? <ScanOverlay /> : null}
        </View>

        {phase === 'analyzing' ? (
          <FadeIn className="items-center gap-4 px-5 pt-6">
            <View className="flex-row items-center gap-2">
              <Icon as={Sparkles} size={18} className="text-primary" />
              <Text role="status" aria-live="polite" className="text-lg font-semibold">
                {t(
                  slow === 2
                    ? 'food.snap.analyzingVerySlow'
                    : slow === 1
                      ? 'food.snap.analyzingSlow'
                      : 'food.snap.analyzing',
                )}
              </Text>
            </View>
            <Button variant="ghost" className="rounded-full" onPress={cancel}>
              <Text>{t('food.snap.cancel')}</Text>
            </Button>
          </FadeIn>
        ) : phase === 'matched' && top ? (
          <FadeIn key="matched" className="gap-5 px-5 pt-5">
            <View className="gap-2.5">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t('food.snap.looksLike')}
              </Text>
              <TopMatch
                candidate={top}
                busy={opening === top.recipe_id}
                onLog={() => logMatch(top)}
              />
            </View>
            {openFailed ? (
              <Text role="alert" className="text-destructive text-center text-sm">
                {t('food.snap.openFailed')}
              </Text>
            ) : null}
            {others.length > 0 ? (
              <View className="gap-2.5">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  {t('food.snap.others')}
                </Text>
                <Pairs
                  items={others}
                  render={(candidate) => (
                    <AltMatch
                      candidate={candidate}
                      busy={opening === candidate.recipe_id}
                      disabled={opening !== null}
                      onPress={() => logMatch(candidate)}
                    />
                  )}
                />
              </View>
            ) : null}
            <Button
              variant="outline"
              className="rounded-full"
              onPress={() => {
                tapHaptic();
                setPhase('retry');
              }}
            >
              <Text>{t('food.snap.noneOfThese')}</Text>
            </Button>
          </FadeIn>
        ) : phase === 'retry' ? (
          <FadeIn key="retry" className="gap-5 px-5 pt-5">
            {top ? (
              <Pressable
                onPress={() => setPhase('matched')}
                role="button"
                className="-ml-1 flex-row items-center gap-1 self-start py-1 active:opacity-70"
              >
                <Icon as={ChevronLeft} size={18} className="text-muted-foreground" />
                <Text className="text-muted-foreground text-sm font-semibold">
                  {t('food.snap.backToMatches')}
                </Text>
              </Pressable>
            ) : null}
            <View className="gap-1.5">
              <Text role="heading" aria-level={2} className="text-xl font-bold">
                {top ? t('food.snap.retryTitle') : t('food.snap.noMatchTitle')}
              </Text>
              <Text className="text-muted-foreground leading-6">{t('food.snap.retryBody')}</Text>
            </View>
            <View className="gap-3">
              <Input
                value={hint}
                onChangeText={(text) => setHint(text.slice(0, HINT_MAX))}
                placeholder={t('food.snap.hintPlaceholder')}
                aria-label={t('food.snap.hintLabel')}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (photo && hint.trim()) void identify(photo, hint);
                }}
                className="h-12 rounded-2xl"
              />
              <Button
                size="lg"
                className="rounded-full"
                disabled={!photo || !hint.trim() || !online}
                onPress={() => photo && identify(photo, hint)}
              >
                <Icon as={Sparkles} size={16} className="text-primary-foreground" />
                <Text>{t('food.snap.lookAgain')}</Text>
              </Button>
            </View>
            <OtherWays onRetake={() => setPhase('source')} onSearch={onSearchInstead} />
          </FadeIn>
        ) : phase === 'error' && problem ? (
          <FadeIn key="error" className="gap-5 px-5 pt-5">
            <View className="gap-1.5" role="alert">
              <View className="flex-row items-center gap-2">
                {problem === 'offline' ? (
                  <Icon as={WifiOff} size={18} className="text-muted-foreground" />
                ) : null}
                <Text className="text-xl font-bold">{t(`food.snap.errors.${problem}.title`)}</Text>
              </View>
              <Text className="text-muted-foreground leading-6">
                {t(`food.snap.errors.${problem}.body`)}
              </Text>
            </View>
            {photo && (problem === 'server' || problem === 'offline') ? (
              <Button
                size="lg"
                className="rounded-full"
                disabled={!online}
                onPress={() => identify(photo, hint || undefined)}
              >
                <Icon as={RefreshCw} size={16} className="text-primary-foreground" />
                <Text>{t('common.retry')}</Text>
              </Button>
            ) : null}
            <OtherWays onRetake={() => setPhase('source')} onSearch={onSearchInstead} />
          </FadeIn>
        ) : null}
      </SheetScrollView>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} label={t('food.snap.title')} flush>
      {body}
      {/* Outside the scroll view so it stays put while the content scrolls. */}
      <Pressable
        onPress={onClose}
        role="button"
        aria-label={t('food.snap.close')}
        hitSlop={8}
        className="bg-card/95 absolute right-3 top-3 z-10 h-10 w-10 items-center justify-center rounded-full shadow-sm shadow-black/10 active:opacity-80"
      >
        <Icon as={X} size={20} className="text-foreground" />
      </Pressable>
    </Sheet>
  );
}

/** Retake or search: always offered when the photo didn't get a match. */
function OtherWays({ onRetake, onSearch }: { onRetake: () => void; onSearch: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3">
      <Button
        variant="outline"
        className="flex-1 rounded-full"
        onPress={() => {
          tapHaptic();
          onRetake();
        }}
      >
        <Icon as={Camera} size={16} className="text-foreground" />
        <Text>{t('food.snap.retake')}</Text>
      </Button>
      <Button variant="ghost" className="flex-1 rounded-full" onPress={onSearch}>
        <Icon as={Search} size={16} className="text-foreground" />
        <Text>{t('food.snap.search')}</Text>
      </Button>
    </View>
  );
}

/** Two cards per row; a lone last card keeps half the width. */
function Pairs<T>({ items, render }: { items: T[]; render: (item: T) => React.ReactNode }) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View className="gap-3">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-3">
          {row.map((item, column) => (
            <View key={column} className="flex-1">
              {render(item)}
            </View>
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

function SourceRow({
  icon,
  label,
  onPress,
}: {
  icon: typeof Camera;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      className="bg-background active:bg-muted hover:bg-muted flex-row items-center gap-3 rounded-2xl px-4 py-4"
    >
      <View className="bg-card h-10 w-10 items-center justify-center rounded-full">
        <Icon as={icon} size={20} className="text-primary" />
      </View>
      <Text className="text-base font-semibold">{label}</Text>
    </Pressable>
  );
}
