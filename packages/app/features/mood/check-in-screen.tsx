'use client';

import {
  MOOD_LEVELS,
  MOOD_NOTE_MAX,
  MOOD_SCALES,
  MOOD_TAGS,
  type MoodLevel,
  type MoodLog,
  type MoodScale,
  type MoodTag,
} from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Check, cn, Icon, NotebookPen, Text, X, Zap } from '@mybela/ui';
import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { MoodFace } from '../../components/mood-face';
import { MoonPhase } from '../../components/moon-phase';
import { Pop } from '../../components/pop';
import { StressGauge } from '../../components/stress-gauge';
import { GAUGE, gaugePoint, segmentMid } from '../../components/stress-gauge-types';
import { useAppDimensions } from '../../lib/dimensions';
import { successHaptic, tapHaptic } from '../../lib/haptics';
import { useInsets } from '../../lib/insets';
import { useAppRouter, useSearchParam } from '../../lib/navigation';
import { useIsOnline } from '../../lib/use-online';
import { useSession } from '../auth/session';
import { useCycleAccess } from '../cycle/queries';
import { useDateLocale } from '../home/use-date-locale';
import { ConnectionStatus } from '../shell/connection-status';
import { Battery, fitFive, MOOD_HALO, TAG_ICONS, useRowWidth } from './components/visuals';
import { todayIso, useMoodDay, useSaveMood } from './queries';

type Draft = Omit<MoodLog, 'day' | 'mood'> & { mood: MoodLevel | null };

const EMPTY: Draft = { mood: null, energy: null, sleep: null, stress: null, tags: [], note: null };
/** mood → energy → sleep → stress → tags & note */
const STEPS = ['mood', ...MOOD_SCALES, 'tags'] as const;
type Step = (typeof STEPS)[number];
const LAST = STEPS.length - 1;
/** Long enough to see the pick land, short enough to keep the whole check-in under ten seconds. */
const ADVANCE_MS = 320;

function parseLevel(value: string | undefined): MoodLevel | null {
  const n = Number(value);
  return (MOOD_LEVELS as readonly number[]).includes(n) ? (n as MoodLevel) : null;
}

/** `?day=` when it's a real day that isn't in the future; otherwise today. */
function useCheckInDay() {
  const param = useSearchParam('day');
  const today = todayIso();
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param) && isValid(parseISO(param)) && param <= today) {
    return { day: param, isToday: param === today };
  }
  return { day: today, isToday: true };
}

/**
 * F12 mood check-in: one question per card, each answered with a single tap that moves on by
 * itself. Only mood is required; after it, "Save now" finishes from any step. Opening it for a day
 * that already has an entry edits that entry (the backend keeps one per day).
 *
 * `?mood=1..5` starts with that mood picked (from Home's faces); `?day=yyyy-MM-dd` checks in for
 * an earlier day.
 */
export function MoodCheckInScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const insets = useInsets();
  const locale = useDateLocale();
  const online = useIsOnline();
  const userId = useSession()?.user.id;
  const save = useSaveMood();
  const { day, isToday } = useCheckInDay();
  const startMood = parseLevel(useSearchParam('mood'));
  const { entry } = useMoodDay(day);
  const showPeriodTag = useCycleAccess() !== 'hidden';

  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, mood: startMood }));
  const [step, setStep] = useState(startMood ? 1 : 0);
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [savedQueued, setSavedQueued] = useState<boolean | null>(null);
  const touched = useRef(startMood !== null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // An existing entry fills the form once it's known, unless the person already started answering.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !entry) return;
    prefilled.current = true;
    if (touched.current) {
      // Came in with a mood picked: keep it, but bring the rest of the day's answers along.
      setDraft((d) => ({ ...entry, mood: d.mood ?? entry.mood }));
    } else {
      setDraft(entry);
    }
  }, [entry]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const goTo = (next: number) => {
    if (timer.current) clearTimeout(timer.current);
    setDirection(next > step ? 'right' : 'left');
    setStep(Math.max(0, Math.min(LAST, next)));
  };

  // Android's back button steps back through the questions before leaving.
  useEffect(() => {
    if (Platform.OS === 'web' || savedQueued !== null || step === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goTo(step - 1);
      return true;
    });
    return () => sub.remove();
  });

  const pick = (key: 'mood' | MoodScale, value: MoodLevel) => {
    tapHaptic();
    touched.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
    if (timer.current) clearTimeout(timer.current);
    const from = step;
    timer.current = setTimeout(() => {
      setDirection('right');
      setStep(Math.min(LAST, from + 1));
    }, ADVANCE_MS);
  };

  const toggleTag = (tag: MoodTag) => {
    tapHaptic();
    touched.current = true;
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((x) => x !== tag) : [...d.tags, tag],
    }));
  };

  const submit = () => {
    if (!draft.mood || !userId) return;
    if (timer.current) clearTimeout(timer.current);
    save.mutate({ ...draft, mood: draft.mood, day, userId });
    successHaptic();
    setSavedQueued(!online);
  };

  const dateLabel = isToday
    ? t('mood.checkIn.today')
    : format(parseISO(day), 'EEEE, d MMMM', { locale });

  if (savedQueued !== null && draft.mood) {
    return (
      <Saved
        level={draft.mood}
        queued={savedQueued}
        isToday={isToday}
        dateLabel={dateLabel}
        onDone={router.back}
      />
    );
  }

  const current: Step = STEPS[step] ?? 'mood';
  const tags = MOOD_TAGS.filter(
    (tag) => tag !== 'period' || showPeriodTag || draft.tags.includes(tag),
  );

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header: close, progress, save-now */}
      <View style={{ paddingTop: insets.top }} className="bg-background">
        <View className="mx-auto h-14 w-full max-w-xl flex-row items-center gap-3 px-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t('common.close')}
            onPress={router.back}
          >
            <Icon as={X} size={22} />
          </Button>
          <View
            className="flex-1 flex-row gap-1.5"
            role="progressbar"
            aria-label={t('mood.checkIn.progress', { step: step + 1, total: STEPS.length })}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
          >
            {STEPS.map((key, i) => (
              <View
                key={key}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i <= step ? 'bg-primary' : 'bg-foreground/10',
                )}
              />
            ))}
          </View>
          <View className="min-w-11 items-end">
            {draft.mood && step < LAST ? (
              <Pressable
                onPress={submit}
                className="rounded-full px-3 py-2 active:opacity-60"
                role="button"
              >
                <Text className="text-sm font-semibold">{t('mood.checkIn.saveNow')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <ConnectionStatus />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn
          key={current}
          from={direction}
          className="mx-auto w-full max-w-md flex-1 justify-center gap-8"
        >
          {current === 'mood' ? (
            <MoodStep
              dateLabel={dateLabel}
              isToday={isToday}
              value={draft.mood}
              onPick={(v) => pick('mood', v)}
            />
          ) : current === 'tags' ? (
            <TagsStep
              isToday={isToday}
              tags={tags}
              picked={draft.tags}
              onToggle={toggleTag}
              note={draft.note ?? ''}
              onNote={(note) => {
                touched.current = true;
                setDraft((d) => ({ ...d, note }));
              }}
            />
          ) : (
            (() => {
              const Step = { energy: EnergyStep, sleep: SleepStep, stress: StressStep }[current];
              return (
                <Step isToday={isToday} value={draft[current]} onPick={(v) => pick(current, v)} />
              );
            })()
          )}
        </FadeIn>
      </ScrollView>

      {/* Footer: back / skip, or save on the last step */}
      {step > 0 ? (
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="bg-background border-border border-t px-4 pt-3"
        >
          <View className="mx-auto w-full max-w-md flex-row items-center gap-3">
            <Button variant="ghost" className="rounded-full px-5" onPress={() => goTo(step - 1)}>
              <Text>{t('onboarding.back')}</Text>
            </Button>
            {/* The spacer pushes Skip right; on the last step Save takes the whole width instead. */}
            {step < LAST ? <View className="flex-1" /> : null}
            {step < LAST ? (
              <Button
                variant="outline"
                className="rounded-full px-6"
                onPress={() => goTo(step + 1)}
              >
                <Text>
                  {draft[current as MoodScale] ? t('onboarding.continue') : t('onboarding.skip')}
                </Text>
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 rounded-full"
                disabled={!draft.mood}
                onPress={submit}
              >
                <Icon as={Check} size={18} className="text-primary-foreground" />
                <Text>{entry ? t('mood.checkIn.update') : t('mood.checkIn.save')}</Text>
              </Button>
            )}
          </View>
        </View>
      ) : (
        <View style={{ height: Math.max(insets.bottom, 12) }} />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────────────────────────

function StepHeading({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint: string }) {
  return (
    <View className="items-center gap-2">
      {eyebrow ? (
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-[1.5px]">
          {eyebrow}
        </Text>
      ) : null}
      <Text
        role="heading"
        aria-level={1}
        className="text-center text-[28px] font-bold leading-9 tracking-tight"
      >
        {title}
      </Text>
      <Text className="text-muted-foreground text-center leading-6">{hint}</Text>
    </View>
  );
}

function MoodStep({
  dateLabel,
  isToday,
  value,
  onPick,
}: {
  dateLabel: string;
  isToday: boolean;
  value: MoodLevel | null;
  onPick: (value: MoodLevel) => void;
}) {
  const { t } = useTranslation();
  // Sized from the row's real width so five faces always fit, down to the narrowest phones.
  const row = useRowWidth();
  const size = fitFive(row.width, { chrome: 12, gap: 4, max: 64 });

  return (
    <>
      <StepHeading
        eyebrow={dateLabel}
        title={isToday ? t('mood.checkIn.mood') : t('mood.checkIn.moodPast')}
        hint={t('mood.checkIn.moodHint')}
      />
      <View className="gap-4">
        <View
          onLayout={row.onLayout}
          className="min-h-16 flex-row items-center justify-between"
          role="radiogroup"
        >
          {size > 0
            ? MOOD_LEVELS.map((level) => {
                const picked = value === level;
                return (
                  <Pressable
                    key={level}
                    role="radio"
                    aria-checked={picked}
                    aria-label={t(`mood.levels.mood.${level}`)}
                    onPress={() => onPick(level)}
                    className={cn(
                      'rounded-full border-2 p-1 active:scale-95',
                      picked ? 'border-primary' : 'border-transparent',
                      Platform.select({ web: 'transition-transform hover:scale-105' }),
                    )}
                  >
                    <Pop active={picked}>
                      <MoodFace level={level} size={size} dimmed={value !== null && !picked} />
                    </Pop>
                  </Pressable>
                );
              })
            : null}
        </View>
        <PickedLabel
          value={value ? t(`mood.levels.mood.${value}`) : null}
          low={t('mood.levels.mood.1')}
          high={t('mood.levels.mood.5')}
        />
      </View>
    </>
  );
}

/** The picked answer in words, or the two ends of the scale before anything is picked. */
function PickedLabel({ value, low, high }: { value: string | null; low: string; high: string }) {
  return (
    <View className="h-8 items-center justify-center" aria-live="polite">
      {value ? (
        <FadeIn key={value}>
          <Text className="text-xl font-semibold">{value}</Text>
        </FadeIn>
      ) : (
        <View className="w-full flex-row justify-between px-1">
          <Text className="text-muted-foreground text-xs">{low}</Text>
          <Text className="text-muted-foreground text-xs">{high}</Text>
        </View>
      )}
    </View>
  );
}

type ScaleProps = {
  isToday: boolean;
  value: MoodLevel | null;
  onPick: (value: MoodLevel) => void;
};

/** Energy: five batteries, from nearly empty to full. */
function EnergyStep({ isToday, value, onPick }: ScaleProps) {
  const { t } = useTranslation();
  return (
    <>
      <View className="items-center gap-5">
        <Pop appear>
          <View className="bg-mood-5/50 h-16 w-16 items-center justify-center rounded-[22px]">
            <Icon as={Zap} size={28} strokeWidth={1.75} className="text-olive" />
          </View>
        </Pop>
        <StepHeading
          title={isToday ? t('mood.checkIn.energy') : t('mood.checkIn.energyPast')}
          hint={t('mood.checkIn.optional')}
        />
      </View>
      <View className="gap-4">
        <View className="flex-row gap-2" role="radiogroup">
          {MOOD_LEVELS.map((level) => {
            const picked = value === level;
            return (
              <Pressable
                key={level}
                role="radio"
                aria-checked={picked}
                aria-label={t(`mood.levels.energy.${level}`)}
                onPress={() => onPick(level)}
                className={cn(
                  'h-28 flex-1 items-center justify-center rounded-2xl border active:scale-95',
                  picked ? 'bg-primary border-primary' : 'bg-card border-border',
                  Platform.select({ web: 'transition-colors hover:border-input' }),
                )}
              >
                <Pop active={picked}>
                  <Battery level={level} height={46} inverted={picked} />
                </Pop>
              </Pressable>
            );
          })}
        </View>
        <PickedLabel
          value={value ? t(`mood.levels.energy.${value}`) : null}
          low={t('mood.levels.energy.1')}
          high={t('mood.levels.energy.5')}
        />
      </View>
    </>
  );
}

/** Sleep: a list from a full moon (slept very well) down to a thin crescent. */
function SleepStep({ isToday, value, onPick }: ScaleProps) {
  const { t } = useTranslation();
  const levels = [...MOOD_LEVELS].reverse();
  return (
    <>
      <StepHeading
        title={isToday ? t('mood.checkIn.sleep') : t('mood.checkIn.sleepPast')}
        hint={t('mood.checkIn.optional')}
      />
      <View className="gap-2" role="radiogroup">
        {levels.map((level) => {
          const picked = value === level;
          return (
            <Pressable
              key={level}
              role="radio"
              aria-checked={picked}
              aria-label={t(`mood.levels.sleep.${level}`)}
              onPress={() => onPick(level)}
              className={cn(
                'h-14 flex-row items-center gap-3.5 rounded-2xl border px-4 active:scale-[0.98]',
                picked ? 'bg-primary border-primary' : 'bg-card border-border',
                Platform.select({ web: 'transition-colors hover:border-input' }),
              )}
            >
              <Pop active={picked}>
                <MoonPhase level={level} size={34} inverted={picked} />
              </Pop>
              <Text
                className={cn(
                  'flex-1 text-base font-medium',
                  picked ? 'text-primary-foreground' : 'text-foreground',
                )}
              >
                {t(`mood.levels.sleep.${level}`)}
              </Text>
              <View
                className={cn(
                  'h-5 w-5 items-center justify-center rounded-full border-2',
                  picked ? 'border-primary-foreground bg-primary-foreground' : 'border-input',
                )}
              >
                {picked ? (
                  <Icon as={Check} size={12} strokeWidth={3} className="text-primary" />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

/**
 * Stress: a pressure gauge. Five segments darken from calm (left) to very stressed (right), each
 * tapped directly on the dial; the needle points at the pick and its word shows underneath.
 */
function StressStep({ isToday, value, onPick }: ScaleProps) {
  const { t } = useTranslation();
  const row = useRowWidth();
  const width = Math.min(300, row.width);
  const scale = width / GAUGE.width;
  // Tap targets: a generous circle centred on each segment, over the drawn dial.
  const target = Math.max(44, Math.round((GAUGE.stroke + 28) * scale));

  return (
    <>
      <StepHeading
        title={isToday ? t('mood.checkIn.stress') : t('mood.checkIn.stressPast')}
        hint={t('mood.checkIn.optional')}
      />
      <View className="items-center gap-3" onLayout={row.onLayout}>
        {width > 0 ? (
          <View style={{ width, height: (width * GAUGE.height) / GAUGE.width }} role="radiogroup">
            <StressGauge value={value} width={width} />
            {MOOD_LEVELS.map((level) => {
              const point = gaugePoint(segmentMid(level));
              return (
                <Pressable
                  key={level}
                  role="radio"
                  aria-checked={value === level}
                  aria-label={t(`mood.levels.stress.${level}`)}
                  onPress={() => onPick(level)}
                  style={{
                    position: 'absolute',
                    width: target,
                    height: target,
                    left: point.x * scale - target / 2,
                    top: point.y * scale - target / 2,
                  }}
                  className="rounded-full active:bg-foreground/5"
                />
              );
            })}
          </View>
        ) : (
          <View style={{ height: 160 }} />
        )}
        <View className="w-full flex-row justify-between" style={{ maxWidth: width + 16 }}>
          <Text className="text-muted-foreground text-xs">{t('mood.levels.stress.1')}</Text>
          <Text className="text-muted-foreground text-xs">{t('mood.levels.stress.5')}</Text>
        </View>
        <View className="h-9 items-center justify-center" aria-live="polite">
          {value ? (
            <FadeIn key={value}>
              <Text className="text-2xl font-bold">{t(`mood.levels.stress.${value}`)}</Text>
            </FadeIn>
          ) : (
            <Text className="text-muted-foreground">{t('mood.checkIn.stressHint')}</Text>
          )}
        </View>
      </View>
    </>
  );
}

function TagsStep({
  isToday,
  tags,
  picked,
  onToggle,
  note,
  onNote,
}: {
  isToday: boolean;
  tags: MoodTag[];
  picked: MoodTag[];
  onToggle: (tag: MoodTag) => void;
  note: string;
  onNote: (note: string) => void;
}) {
  const { t } = useTranslation();
  const { width } = useAppDimensions();
  const [noteOpen, setNoteOpen] = useState(note.length > 0);
  const columns = width < 360 ? 3 : 4;

  return (
    <>
      <StepHeading
        title={isToday ? t('mood.checkIn.tags') : t('mood.checkIn.tagsPast')}
        hint={t('mood.checkIn.tagsHint')}
      />
      <View className="-mx-1 flex-row flex-wrap">
        {tags.map((tag) => {
          const on = picked.includes(tag);
          return (
            <View key={tag} style={{ width: `${100 / columns}%` }} className="p-1">
              <Pressable
                role="checkbox"
                aria-checked={on}
                aria-label={t(`mood.tags.${tag}`)}
                onPress={() => onToggle(tag)}
                className={cn(
                  'items-center gap-1.5 rounded-2xl border px-1 py-3 active:scale-95',
                  on ? 'bg-primary border-primary' : 'bg-card border-border',
                  Platform.select({ web: 'transition-colors hover:border-input' }),
                )}
              >
                <Pop active={on}>
                  <Icon
                    as={TAG_ICONS[tag]}
                    size={22}
                    strokeWidth={1.75}
                    className={on ? 'text-primary-foreground' : 'text-foreground'}
                  />
                </Pop>
                <Text
                  numberOfLines={1}
                  className={cn(
                    'text-xs font-medium',
                    on ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {t(`mood.tags.${tag}`)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {noteOpen ? (
        <FadeIn className="gap-2">
          <Text nativeID="mood-note-label" className="px-1 text-sm font-semibold">
            {t('mood.checkIn.noteLabel')}
          </Text>
          <TextInput
            aria-labelledby="mood-note-label"
            value={note}
            onChangeText={onNote}
            placeholder={t('mood.checkIn.notePlaceholder')}
            multiline
            maxLength={MOOD_NOTE_MAX}
            autoFocus={note.length === 0}
            textAlignVertical="top"
            className="bg-card border-input text-foreground placeholder:text-muted-foreground min-h-[104px] rounded-2xl border px-4 py-3 text-base leading-6"
          />
          {note.length > MOOD_NOTE_MAX - 200 ? (
            <Text className="text-muted-foreground px-1 text-right text-xs">
              {t('mood.checkIn.noteCount', { count: note.length, max: MOOD_NOTE_MAX })}
            </Text>
          ) : null}
        </FadeIn>
      ) : (
        <Pressable
          onPress={() => setNoteOpen(true)}
          className="border-border flex-row items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 active:opacity-70"
          role="button"
        >
          <Icon as={NotebookPen} size={20} className="text-muted-foreground" />
          <Text className="text-muted-foreground flex-1">{t('mood.checkIn.addNote')}</Text>
        </Pressable>
      )}
    </>
  );
}

// ─── Saved ──────────────────────────────────────────────────────────────────────────────────────

/** A calm "done" moment: the picked face springs in. Returns by itself after a beat. */
function Saved({
  level,
  queued,
  isToday,
  dateLabel,
  onDone,
}: {
  level: MoodLevel;
  queued: boolean;
  isToday: boolean;
  dateLabel: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const insets = useInsets();

  useEffect(() => {
    // Offline, the extra sentence needs time to be read; stay until they tap Done.
    if (queued) return;
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [queued, onDone]);

  return (
    <View
      className="bg-background flex-1 items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="w-full max-w-sm items-center gap-6">
        <Pop appear>
          <View
            className={cn('h-40 w-40 items-center justify-center rounded-full', MOOD_HALO[level])}
          >
            <MoodFace level={level} size={112} />
          </View>
        </Pop>
        <FadeIn delay={140} className="items-center gap-2">
          <Text role="heading" aria-level={1} className="text-center text-2xl font-bold">
            {t('mood.checkIn.savedTitle')}
          </Text>
          <Text className="text-muted-foreground text-center leading-6" role="status">
            {isToday
              ? t('mood.checkIn.savedToday')
              : t('mood.checkIn.savedPast', { date: dateLabel })}
          </Text>
          {queued ? (
            <Text className="text-muted-foreground text-center text-sm leading-5">
              {t('mood.checkIn.savedQueued')}
            </Text>
          ) : null}
        </FadeIn>
        <FadeIn delay={220} className="w-full">
          <Button
            size="lg"
            variant={queued ? 'default' : 'outline'}
            className="rounded-full"
            onPress={onDone}
          >
            <Text>{t('mood.checkIn.done')}</Text>
          </Button>
        </FadeIn>
      </View>
    </View>
  );
}
