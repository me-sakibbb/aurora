'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Check, cn, Icon, type IconComponent, PartyPopper, Text } from '@aurora/ui';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  View,
} from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { Pop } from '../../../components/pop';
import { successHaptic } from '../../../lib/haptics';
import { useInsets } from '../../../lib/insets';
import { useReducedMotion } from '../../../lib/use-reduced-motion';

// Plain RN Animated (like FadeIn): runs on the UI thread on native and works on react-native-web.
const useNativeDriver = Platform.OS !== 'web';

/**
 * `light`: the app background with soft glows, for the in-between milestones.
 * `olive`: the brand's dark olive floods the screen, for the big moments (account, finish).
 * Fixed brand colors (not theme roles) so the olive moments look the same in every theme.
 */
export type CelebrationTone = 'light' | 'olive';

const TONE = {
  light: {
    title: 'text-foreground',
    subtitle: 'text-muted-foreground',
    chip: 'bg-sage/15',
    chipText: 'text-muted-foreground',
    chipTick: 'bg-sage',
    chipTickIcon: 'text-ivory',
    disc: 'bg-olive',
    discIcon: 'text-ivory',
    halo: 'bg-sage/15',
    ripple: 'bg-sage/25',
    orbitDot: 'bg-sage/45',
    planet: 'bg-taupe',
    confetti: ['bg-olive', 'bg-sage', 'bg-taupe', 'bg-accent', 'bg-muted-foreground'],
    burst: ['bg-taupe', 'bg-sage'],
  },
  olive: {
    title: 'text-ivory',
    subtitle: 'text-ivory/75',
    chip: 'bg-ivory/10',
    chipText: 'text-ivory/80',
    chipTick: 'bg-taupe',
    chipTickIcon: 'text-olive',
    disc: 'bg-ivory',
    discIcon: 'text-olive',
    halo: 'bg-ivory/5',
    ripple: 'bg-ivory/10',
    orbitDot: 'bg-ivory/25',
    planet: 'bg-taupe',
    confetti: ['bg-ivory', 'bg-taupe', 'bg-sage', 'bg-ivory/60', 'bg-taupe/70'],
    burst: ['bg-taupe', 'bg-ivory'],
  },
} as const;

// ─── Confetti ───────────────────────────────────────────────────────────────────────────────────

const CONFETTI_MS = 2600;
/** Points sampled along each piece's path; RN interpolates linearly between them. */
const SAMPLES = 12;

type Piece = {
  color: string;
  width: number;
  height: number;
  round: boolean;
  input: number[];
  x: number[];
  y: number[];
  rotate: string[];
  flip: number[];
  opacity: { input: number[]; output: number[] };
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** A burst fired upwards in a fan, then pulled down by gravity, spinning and fading at the end. */
function makePieces(count: number, spreadDeg: number, colors: readonly string[]): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const start = random(0.01, 0.1);
    const angle = ((-90 + random(-spreadDeg / 2, spreadDeg / 2)) * Math.PI) / 180;
    const speed = random(300, 600);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const gravity = random(1150, 1450);
    const spin = random(360, 1080) * (Math.random() < 0.5 ? -1 : 1);
    const flips = random(1.5, 3.5);
    const sway = random(6, 16);
    const round = i % 4 === 0;
    const input: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    const rotate: string[] = [];
    const flip: number[] = [];
    for (let k = 0; k <= SAMPLES; k++) {
      const tau = k / SAMPLES;
      input.push(start + (1 - start) * tau);
      // Air drag slows the sideways drift; a little sway makes it flutter.
      x.push(vx * 0.9 * (1 - (1 - tau) ** 2) + Math.sin(tau * Math.PI * 3) * sway);
      y.push(vy * tau + 0.5 * gravity * tau * tau);
      rotate.push(`${spin * tau}deg`);
      flip.push(round ? 1 : Math.cos(tau * Math.PI * 2 * flips));
    }
    return {
      color: colors[i % colors.length] as string,
      width: round ? 8 : random(6, 9),
      height: round ? 8 : random(10, 14),
      round,
      input,
      x,
      y,
      rotate,
      flip,
      opacity: { input: [0, start, start + 0.01, 0.78, 1], output: [0, 0, 1, 1, 0] },
    };
  });
}

/** Confetti bursting from the centre of its parent. Purely decorative. */
export function Confetti({
  colors,
  count = 40,
  spread = 150,
  delay = 0,
}: {
  colors: readonly string[];
  count?: number;
  spread?: number;
  delay?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [pieces] = useState(() => makePieces(count, spread, colors));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: CONFETTI_MS,
      delay,
      easing: Easing.linear,
      useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return (
    <View aria-hidden pointerEvents="none" className="absolute left-1/2 top-1/2 h-0 w-0">
      {pieces.map((piece, i) => {
        const at = (output: number[] | string[]) =>
          progress.interpolate({
            inputRange: piece.input,
            outputRange: output as number[],
            extrapolate: 'clamp',
          });
        return (
          <Animated.View
            key={i}
            className={cn('absolute', piece.color, piece.round ? 'rounded-full' : 'rounded-sm')}
            style={{
              left: -piece.width / 2,
              top: -piece.height / 2,
              width: piece.width,
              height: piece.height,
              opacity: progress.interpolate({
                inputRange: piece.opacity.input,
                outputRange: piece.opacity.output,
              }),
              transform: [
                { translateX: at(piece.x) },
                { translateY: at(piece.y) },
                { rotate: at(piece.rotate) },
                { scaleX: at(piece.flip) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** Small dots flying out of the badge and fading: a quieter burst for the in-between milestones. */
function DotBurst({ colors }: { colors: readonly string[] }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      delay: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View aria-hidden pointerEvents="none" className="absolute left-1/2 top-1/2 h-0 w-0">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + 0.25;
        const far = i % 2 === 0 ? 120 : 98;
        const size = i % 2 === 0 ? 8 : 5;
        return (
          <Animated.View
            key={i}
            className={cn('absolute rounded-full', colors[i % colors.length])}
            style={{
              left: -size / 2,
              top: -size / 2,
              width: size,
              height: size,
              opacity: progress.interpolate({
                inputRange: [0, 0.1, 0.7, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Math.cos(angle) * 60, Math.cos(angle) * far],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Math.sin(angle) * 60, Math.sin(angle) * far],
                  }),
                },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────────────────────────

const ORBIT_SIZE = 184;
const ORBIT_RADIUS = 84;
const ORBIT_DOTS = 28;
/** Dots on the orbit that are drawn larger, in the accent color. */
const PLANETS = new Set([3, 13, 22]);

/** A ring of dots turning slowly around the badge. */
function Orbit({ tone, reduced }: { tone: CelebrationTone; reduced: boolean }) {
  const turn = useRef(new Animated.Value(0)).current;
  const styles = TONE[tone];

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, turn]);

  return (
    <Animated.View
      className="absolute"
      style={{
        width: ORBIT_SIZE,
        height: ORBIT_SIZE,
        transform: [
          { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    >
      {Array.from({ length: ORBIT_DOTS }, (_, i) => {
        const angle = (i / ORBIT_DOTS) * Math.PI * 2;
        const planet = PLANETS.has(i);
        const size = planet ? 9 : 4;
        return (
          <View
            key={i}
            className={cn('absolute rounded-full', planet ? styles.planet : styles.orbitDot)}
            style={{
              width: size,
              height: size,
              left: ORBIT_SIZE / 2 + Math.cos(angle) * ORBIT_RADIUS - size / 2,
              top: ORBIT_SIZE / 2 + Math.sin(angle) * ORBIT_RADIUS - size / 2,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/** A small dot with a soft halo that swells and fades on a loop, matching the orbit's dots. */
function Glint({ delay, size, className }: { delay: number; size: number; className: string }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
        Animated.delay(600),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, delay, pulse]);

  return (
    <Animated.View
      aria-hidden
      className={cn('absolute items-center justify-center', className)}
      style={{
        width: size * 2,
        height: size * 2,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      <View
        className="bg-taupe/25 absolute rounded-full"
        style={{ width: size * 2, height: size * 2 }}
      />
      <View className="bg-taupe rounded-full" style={{ width: size, height: size }} />
    </Animated.View>
  );
}

/**
 * The icon springs in on a disc inside a slowly turning orbit of dots, with soft ripples, two
 * pulsing glints and an optional burst (dots or confetti).
 */
export function CelebrationBadge({
  icon,
  tone,
  burst = 'none',
}: {
  icon: IconComponent;
  tone: CelebrationTone;
  burst?: 'confetti' | 'dots' | 'none';
}) {
  const reduced = useReducedMotion();
  const styles = TONE[tone];
  const disc = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const glyph = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      disc.setValue(1);
      glyph.setValue(1);
      return;
    }
    const entrance = Animated.parallel([
      Animated.spring(disc, { toValue: 1, friction: 5, tension: 110, useNativeDriver }),
      Animated.spring(glyph, {
        toValue: 1,
        friction: 4,
        tension: 90,
        delay: 160,
        useNativeDriver,
      }),
    ]);
    const ripple = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
    );
    entrance.start();
    ripple.start();
    return () => {
      entrance.stop();
      ripple.stop();
    };
  }, [reduced, disc, glyph, ring]);

  // Two ripples half a cycle apart, so one is always on its way out.
  const ripples = [0, 0.5].map((offset) => {
    const phase = Animated.modulo(Animated.add(ring, offset), 1);
    return {
      opacity: phase.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
      transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
    };
  });

  return (
    <View aria-hidden className="h-52 w-52 items-center justify-center self-center">
      <View className={cn('absolute h-40 w-40 rounded-full', styles.halo)} />
      {reduced
        ? null
        : ripples.map((style, i) => (
            <Animated.View
              key={i}
              className={cn('absolute h-28 w-28 rounded-full', styles.ripple)}
              style={style}
            />
          ))}
      <Orbit tone={tone} reduced={reduced} />
      <Animated.View
        className={cn(
          'h-28 w-28 items-center justify-center rounded-full shadow-xl shadow-black/30',
          styles.disc,
        )}
        style={{
          transform: [{ scale: disc.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          opacity: disc.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        }}
      >
        <Animated.View
          style={{
            opacity: glyph,
            transform: [
              { scale: glyph.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              {
                rotate: glyph.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }),
              },
            ],
          }}
        >
          <Icon as={icon} size={48} strokeWidth={1.6} className={styles.discIcon} />
        </Animated.View>
      </Animated.View>
      <Glint delay={500} size={9} className="right-8 top-9" />
      <Glint delay={1300} size={6} className="bottom-11 left-9" />
      {reduced ? null : burst === 'confetti' ? (
        <>
          <Confetti colors={styles.confetti} count={46} />
          <Confetti colors={styles.confetti} count={28} spread={230} delay={280} />
        </>
      ) : burst === 'dots' ? (
        <DotBurst colors={styles.burst} />
      ) : null}
    </View>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────────────────────────

/** Soft blurred glows (web) / faint blobs (native) in the corners. */
function Glows({ tone }: { tone: CelebrationTone }) {
  const blur = Platform.select({ web: 'blur-3xl' });
  const olive = tone === 'olive';
  return (
    <View aria-hidden pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View
        className={cn(
          'absolute -right-28 -top-24 h-96 w-96 rounded-full',
          olive ? (blur ? 'bg-sage/45' : 'bg-sage/20') : blur ? 'bg-sage/25' : 'bg-sage/10',
          blur,
        )}
      />
      <View
        className={cn(
          'absolute -bottom-32 -left-28 h-96 w-96 rounded-full',
          olive ? (blur ? 'bg-taupe/25' : 'bg-taupe/10') : blur ? 'bg-taupe/30' : 'bg-taupe/10',
          blur,
        )}
      />
    </View>
  );
}

/** The olive floods in as a circle growing from just above the middle of the screen. */
function OliveReveal() {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const grow = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  // Big enough to cover the corners from its off-centre starting point.
  const size = Math.hypot(width, height) * 1.25;

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(grow, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, grow]);

  return (
    <Animated.View
      aria-hidden
      pointerEvents="none"
      className="bg-olive absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: width / 2 - size / 2,
        top: height * 0.42 - size / 2,
        transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }],
      }}
    />
  );
}

/** Full-screen celebration: no header or progress, content centred, one action at the bottom. */
function CelebrationShell({
  tone,
  children,
  action,
}: {
  tone: CelebrationTone;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const insets = useInsets();
  return (
    <View
      className="bg-background flex-1 overflow-hidden"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {tone === 'olive' ? <OliveReveal /> : null}
      <FadeIn delay={tone === 'olive' ? 250 : 0} className="absolute inset-0">
        <Glows tone={tone} />
      </FadeIn>
      <View className="w-full max-w-md flex-1 self-center px-6">
        <View className="flex-1 items-center justify-center gap-3 py-6">{children}</View>
        {action ? (
          <FadeIn delay={550} className="gap-2 pb-6">
            {action}
          </FadeIn>
        ) : null}
      </View>
    </View>
  );
}

function CelebrationText({
  tone,
  eyebrow,
  title,
  subtitle,
}: {
  tone: CelebrationTone;
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  const styles = TONE[tone];
  return (
    <View className="items-center gap-3">
      {eyebrow ? (
        <FadeIn delay={260}>
          <View
            className={cn(
              'flex-row items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5',
              styles.chip,
            )}
          >
            <View
              className={cn('h-5 w-5 items-center justify-center rounded-full', styles.chipTick)}
            >
              <Icon as={Check} size={12} strokeWidth={3} className={styles.chipTickIcon} />
            </View>
            <Text
              className={cn('text-xs font-semibold uppercase tracking-widest', styles.chipText)}
            >
              {eyebrow}
            </Text>
          </View>
        </FadeIn>
      ) : null}
      <FadeIn delay={340} className="items-center gap-2.5">
        <Text
          role="heading"
          aria-level={1}
          aria-live="polite"
          className={cn(
            'text-center text-[32px] font-semibold leading-10 tracking-tight',
            // Even line lengths instead of one word alone on the last line.
            Platform.select({ web: 'text-balance' }),
            styles.title,
          )}
        >
          {title}
        </Text>
        <Text className={cn('max-w-xs text-center text-base leading-6', styles.subtitle)}>
          {subtitle}
        </Text>
      </FadeIn>
    </View>
  );
}

/** Primary action, inverted (ivory on olive) on the olive screens. */
function CelebrationButton({
  tone,
  label,
  onPress,
}: {
  tone: CelebrationTone;
  label: string;
  onPress: () => void;
}) {
  const olive = tone === 'olive';
  return (
    <Button
      size="lg"
      onPress={onPress}
      className={cn(
        'h-14 rounded-2xl',
        olive && cn('bg-ivory active:bg-ivory/90', Platform.select({ web: 'hover:bg-ivory/90' })),
      )}
    >
      <Text className={cn('font-semibold', olive && 'text-olive')}>{label}</Text>
    </Button>
  );
}

// ─── Screens ────────────────────────────────────────────────────────────────────────────────────

/** Whether to move on by itself. Not with a screen reader on (it needs time to read the text). */
function useAutoContinue() {
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    // react-native-web always answers `true` here, so only ask on native.
    if (Platform.OS === 'web') return;
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => active && setScreenReader(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return !screenReader;
}

/** Calls `onLeave` once: after `autoMs` (unless a screen reader is on) or from the button. */
function useLeave(onLeave: () => void, autoMs: number, enabled = true) {
  const auto = useAutoContinue();
  const left = useRef(false);
  const latest = useRef(onLeave);
  latest.current = onLeave;
  const leave = useRef(() => {
    if (left.current) return;
    left.current = true;
    latest.current();
  }).current;

  useEffect(() => {
    if (!auto || !enabled) return;
    const timer = setTimeout(leave, autoMs);
    return () => clearTimeout(timer);
  }, [auto, enabled, autoMs, leave]);

  return leave;
}

/** A short "well done" screen between sections. Moves on by itself, or straight away with Continue. */
export function MilestoneScreen({
  icon,
  tone,
  burst,
  eyebrow,
  title,
  subtitle,
  onContinue,
  autoMs = 2800,
}: {
  icon: IconComponent;
  tone: CelebrationTone;
  burst: 'confetti' | 'dots';
  eyebrow: string;
  title: string;
  subtitle: string;
  onContinue: () => void;
  autoMs?: number;
}) {
  const { t } = useTranslation();
  const leave = useLeave(onContinue, autoMs);

  useEffect(() => {
    successHaptic();
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);

  return (
    <CelebrationShell
      tone={tone}
      action={<CelebrationButton tone={tone} label={t('onboarding.continue')} onPress={leave} />}
    >
      <CelebrationBadge icon={icon} tone={tone} burst={burst} />
      <CelebrationText tone={tone} eyebrow={eyebrow} title={title} subtitle={subtitle} />
    </CelebrationShell>
  );
}

const STEP_MS = 650;

/**
 * Shown while the answers are submitted, then the big finish. The checklist ticks along at a
 * steady pace but the last item only ticks once the backend has confirmed the save. The items
 * are reassurance copy, not real sub-tasks.
 */
export function FinaleScreen({
  items,
  saved,
  onDone,
}: {
  items: string[];
  saved: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [ticked, setTicked] = useState(0);
  const allTicked = ticked >= items.length;
  const [finished, setFinished] = useState(false);
  const leave = useLeave(onDone, 4500, finished);

  useEffect(() => {
    if (allTicked) {
      const timer = setTimeout(() => setFinished(true), 450);
      return () => clearTimeout(timer);
    }
    const waitingOnSave = ticked === items.length - 1 && !saved;
    if (waitingOnSave) return;
    const timer = setTimeout(() => setTicked((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [ticked, allTicked, items.length, saved]);

  useEffect(() => {
    if (!finished) return;
    successHaptic();
    AccessibilityInfo.announceForAccessibility(t('onboarding.finale.doneTitle'));
  }, [finished, t]);

  if (finished) {
    return (
      <CelebrationShell
        tone="olive"
        action={
          <CelebrationButton tone="olive" label={t('onboarding.finale.go')} onPress={leave} />
        }
      >
        <CelebrationBadge icon={PartyPopper} tone="olive" burst="confetti" />
        <CelebrationText
          tone="olive"
          eyebrow={t('onboarding.finale.doneEyebrow')}
          title={t('onboarding.finale.doneTitle')}
          subtitle={t('onboarding.finale.doneSubtitle')}
        />
      </CelebrationShell>
    );
  }

  return (
    <CelebrationShell tone="light">
      <Spinner />
      <FadeIn delay={150} className="items-center pb-3">
        <Text
          role="heading"
          aria-level={1}
          className="text-center text-[28px] font-semibold leading-9 tracking-tight"
        >
          {t('onboarding.finale.saving')}
        </Text>
      </FadeIn>
      <FadeIn delay={250} className="w-full">
        <View
          aria-busy={!allTicked}
          className="bg-card border-border w-full gap-4 rounded-3xl border p-5 shadow-lg shadow-black/5"
        >
          {items.map((item, i) => (
            <View key={item} className="flex-row items-center gap-3">
              <ChecklistMark state={i < ticked ? 'done' : i === ticked ? 'working' : 'waiting'} />
              <Text
                className={cn(
                  'flex-1 text-base',
                  i < ticked ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </CelebrationShell>
  );
}

function ChecklistMark({ state }: { state: 'waiting' | 'working' | 'done' }) {
  return (
    <View className="h-7 w-7 items-center justify-center">
      {state === 'done' ? (
        <Pop appear className="bg-olive h-7 w-7 items-center justify-center rounded-full">
          <Icon as={Check} size={15} strokeWidth={3} className="text-ivory" />
        </Pop>
      ) : state === 'working' ? (
        <ActivityIndicator size="small" className="text-accent" />
      ) : (
        <View className="border-border h-7 w-7 rounded-full border-2" />
      )}
    </View>
  );
}

/** While saving: the same orbit as the badge, around a turning arc. */
function Spinner() {
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver }),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, turn]);

  return (
    <View aria-hidden className="h-52 w-52 items-center justify-center self-center">
      <View className="bg-sage/15 absolute h-40 w-40 rounded-full" />
      <Orbit tone="light" reduced={reduced} />
      <View className="bg-card h-28 w-28 items-center justify-center rounded-full shadow-xl shadow-black/10">
        <Animated.View
          className="border-muted border-t-olive h-20 w-20 rounded-full border-4"
          style={{
            transform: [
              { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        />
      </View>
    </View>
  );
}
