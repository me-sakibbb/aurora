'use client';

import { MOOD_LEVELS, MOOD_SCALES, type MoodLevel, type MoodLog } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { ChevronRight, CloudOff, cn, Icon, Pencil, Text } from '@mybela/ui';
import { format, parseISO } from 'date-fns';
import { Platform, Pressable, View } from 'react-native';
import { MoodFace } from '../../../components/mood-face';
import { Pop } from '../../../components/pop';
import { tapHaptic } from '../../../lib/haptics';
import { Panel } from '../../home/components/primitives';
import { useDateLocale } from '../../home/use-date-locale';
import { fitFive, MOOD_HALO, ScaleGlyph, TAG_ICONS, useRowWidth } from './visuals';

const pressable = Platform.select({ web: 'transition-colors hover:bg-muted', default: '' });

/** "Saved on this device" for an entry that hasn't synced yet. */
export function WaitingNote() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-1.5" role="status">
      <Icon as={CloudOff} size={13} className="text-muted-foreground" />
      <Text className="text-muted-foreground text-xs">{t('mood.screen.waiting')}</Text>
    </View>
  );
}

/**
 * Everything answered in one check-in, as entered: the face, the 1–5 answers as meters, tags and
 * the note. Unanswered parts are left out rather than shown empty.
 */
export function EntryDetails({ entry, waiting }: { entry: MoodLog; waiting?: boolean }) {
  const { t } = useTranslation();
  const scales = MOOD_SCALES.filter((scale) => entry[scale] !== null);
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <View
          className={cn(
            'h-[72px] w-[72px] items-center justify-center rounded-full',
            MOOD_HALO[entry.mood],
          )}
        >
          <MoodFace level={entry.mood} size={56} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold tracking-tight">
            {t(`mood.levels.mood.${entry.mood}`)}
          </Text>
          {waiting ? <WaitingNote /> : null}
        </View>
      </View>

      {scales.length > 0 ? (
        <View className="flex-row gap-2">
          {scales.map((scale) => {
            const level = entry[scale] as MoodLevel;
            return (
              // Centred column: glyph in a fixed-height slot, then the answer (wraps, never cut),
              // then the scale's name, so the three tiles line up exactly.
              <View
                key={scale}
                className="bg-muted/60 min-w-0 flex-1 items-center gap-1.5 rounded-2xl px-2 pb-3 pt-3.5"
                aria-label={`${t(`mood.scales.${scale}`)}: ${t(`mood.levels.${scale}.${level}`)}`}
              >
                <View className="h-8 items-center justify-center">
                  <ScaleGlyph scale={scale} level={level} slot={32} />
                </View>
                <Text numberOfLines={2} className="text-center text-sm font-semibold leading-5">
                  {t(`mood.levels.${scale}.${level}`)}
                </Text>
                <Text className="text-muted-foreground text-center text-[11px] font-semibold uppercase tracking-wider">
                  {t(`mood.scales.${scale}`)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {entry.tags.length > 0 ? (
        // Icon + word, separated by space rather than boxed pills (a single wrapping line).
        <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-1">
          {entry.tags.map((tag) => (
            <View key={tag} className="flex-row items-center gap-1.5">
              <Icon as={TAG_ICONS[tag]} size={15} className="text-muted-foreground" />
              <Text className="text-sm">{t(`mood.tags.${tag}`)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {entry.note ? (
        <View className="border-secondary border-l-[3px] py-0.5 pl-3">
          <Text className="leading-6">{entry.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** One past check-in in the history list. */
export function EntryRow({
  entry,
  waiting,
  onPress,
}: {
  entry: MoodLog;
  waiting: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const date = parseISO(entry.day);
  const detail = [
    ...entry.tags.slice(0, 3).map((tag) => t(`mood.tags.${tag}`)),
    entry.tags.length > 3 ? `+${entry.tags.length - 3}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={`${format(date, 'PPPP', { locale })}, ${t(`mood.levels.mood.${entry.mood}`)}`}
      className={cn(
        'bg-card border-border mb-2.5 flex-row items-center gap-4 rounded-3xl border px-4 py-3.5 active:opacity-80',
        pressable,
      )}
    >
      <View className="w-11 items-center">
        <Text className="text-muted-foreground text-[11px] font-semibold uppercase">
          {format(date, 'EEE', { locale })}
        </Text>
        <Text className="text-xl font-bold leading-7">{format(date, 'd', { locale })}</Text>
      </View>
      <MoodFace level={entry.mood} size={40} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-semibold">{t(`mood.levels.mood.${entry.mood}`)}</Text>
        {entry.note ? (
          <Text numberOfLines={1} className="text-muted-foreground text-sm">
            {entry.note}
          </Text>
        ) : detail ? (
          <Text numberOfLines={1} className="text-muted-foreground text-sm">
            {detail}
          </Text>
        ) : (
          <Text className="text-muted-foreground text-sm">
            {format(date, 'MMMM yyyy', { locale })}
          </Text>
        )}
        {waiting ? <WaitingNote /> : null}
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

/**
 * The top of the Mood screen: an inviting row of faces when today has no check-in (a tap starts
 * it with that mood), or today's entry with Edit once it does.
 */
export function TodayPanel({
  entry,
  waiting,
  onStart,
}: {
  entry: MoodLog | null | undefined;
  waiting: boolean;
  onStart: (mood?: MoodLevel) => void;
}) {
  const { t } = useTranslation();

  if (entry) {
    return (
      <Panel className="gap-4">
        <View className="flex-row items-center">
          <Text className="text-muted-foreground flex-1 text-xs font-semibold uppercase tracking-[1.5px]">
            {t('mood.screen.today')}
          </Text>
          <Pressable
            onPress={() => onStart()}
            role="button"
            className="bg-muted -my-1 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
          >
            <Icon as={Pencil} size={14} />
            <Text className="text-sm font-semibold">{t('mood.screen.edit')}</Text>
          </Pressable>
        </View>
        <EntryDetails entry={entry} waiting={waiting} />
      </Panel>
    );
  }

  return (
    <View className="bg-primary gap-5 rounded-[28px] p-6 shadow-sm shadow-black/10">
      <View className="gap-1.5">
        <Text className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-[1.5px]">
          {t('mood.screen.today')}
        </Text>
        <Text role="heading" aria-level={2} className="text-primary-foreground text-2xl font-bold">
          {t('mood.screen.prompt')}
        </Text>
        <Text className="text-primary-foreground/75 leading-6">{t('mood.screen.promptBody')}</Text>
      </View>
      <FaceRow onPick={onStart} />
    </View>
  );
}

/** Five tappable faces that start a check-in with that mood (Mood screen and Home). */
export function FaceRow({
  onPick,
  picked,
  max = 52,
}: {
  onPick: (mood: MoodLevel) => void;
  picked?: MoodLevel | null;
  /** Largest face size; smaller rows shrink the faces so all five always fit. */
  max?: number;
}) {
  const { t } = useTranslation();
  const row = useRowWidth();
  const size = fitFive(row.width, { chrome: 10, gap: 4, max });
  return (
    <View
      onLayout={row.onLayout}
      style={{ minHeight: max + 10 }}
      className="flex-row items-center justify-between"
    >
      {size === 0
        ? null
        : MOOD_LEVELS.map((level) => (
            <Pressable
              key={level}
              onPress={() => {
                tapHaptic();
                onPick(level);
              }}
              role="button"
              aria-label={t(`mood.levels.mood.${level}`)}
              aria-selected={picked === level}
              className={cn(
                'rounded-full p-[3px] active:scale-90',
                picked === level ? 'border-primary border-2' : 'border-2 border-transparent',
                Platform.select({ web: 'transition-transform hover:scale-110' }),
              )}
            >
              <Pop active={picked === level}>
                <MoodFace level={level} size={size} dimmed={Boolean(picked) && picked !== level} />
              </Pop>
            </Pressable>
          ))}
    </View>
  );
}
