'use client';

import { PhotoProblem, type PhotoSource, type PickedPhoto } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Camera, Icon, ImagePlus, Pencil, Text, Trash2 } from '@mybela/ui';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FadeIn } from '../../../../components/fade-in';
import { FoodImage } from '../../../../components/food-image';
import { Sheet } from '../../../../components/sheet';
import { tapHaptic } from '../../../../lib/haptics';
import { methodIcon } from '../../method-icons';
import { compressPhoto, pickPhoto } from '../../photo';

/**
 * The recipe's photo: a big 4:3 tile (the card shape) that shows the cooking-method illustration
 * until a photo is added. Tapping it offers the camera or the gallery; the picked photo is shrunk
 * right away (see photo-plan.ts in @mybela/api) so saving only uploads a small JPEG.
 */
export function PhotoPicker({
  uri,
  method,
  onPick,
  onRemove,
  notice,
}: {
  /** What to show: the new photo's local URI or the recipe's current photo URL. */
  uri: string | null;
  method: string | null;
  onPick: (photo: PickedPhoto) => void;
  onRemove: () => void;
  /** A message from outside, e.g. a draft photo that's gone. */
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const choose = async (source: PhotoSource) => {
    setSourceOpen(false);
    setProblem(null);
    try {
      const picked = await pickPhoto(source);
      if (!picked) return;
      setBusy(true);
      onPick(await compressPhoto(picked));
    } catch (error) {
      const reason = error instanceof PhotoProblem ? error.reason : 'failed';
      setProblem(t(`food.recipes.photo.${reason}`));
    } finally {
      setBusy(false);
    }
  };

  const open = () => {
    tapHaptic();
    setSourceOpen(true);
  };
  const message = problem ?? notice;

  return (
    <View className="gap-2">
      <Pressable
        onPress={open}
        disabled={busy}
        role="button"
        aria-label={uri ? t('food.recipes.photo.change') : t('food.recipes.photo.add')}
        className="bg-sage/15 border-border aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border active:opacity-90"
      >
        {uri ? (
          <FoodImage uri={uri} className="absolute inset-0" fallback={null} />
        ) : (
          <View className="items-center gap-3 px-6">
            <View className="bg-card/80 h-20 w-20 items-center justify-center rounded-full">
              <Icon
                as={methodIcon(method)}
                size={40}
                strokeWidth={1.25}
                className="text-primary/80"
              />
            </View>
            <View className="bg-card flex-row items-center gap-2 rounded-full px-4 py-2 shadow-sm shadow-black/10">
              <Icon as={ImagePlus} size={16} className="text-foreground" />
              <Text className="text-sm font-semibold">{t('food.recipes.photo.add')}</Text>
            </View>
            <Text className="text-muted-foreground text-center text-xs">
              {t('food.recipes.photo.optional')}
            </Text>
          </View>
        )}
        {busy ? (
          <View className="bg-background/70 absolute inset-0 items-center justify-center gap-2">
            <ActivityIndicator className="text-primary" />
            <Text className="text-sm font-medium">{t('food.recipes.photo.working')}</Text>
          </View>
        ) : null}
        {uri && !busy ? (
          <View className="absolute bottom-3 right-3 flex-row gap-2">
            <RoundAction label={t('food.recipes.photo.change')} icon={Pencil} onPress={open} />
            <RoundAction label={t('food.recipes.photo.remove')} icon={Trash2} onPress={onRemove} />
          </View>
        ) : null}
      </Pressable>
      {message ? (
        <FadeIn>
          <Text className="text-muted-foreground text-sm" role="status">
            {message}
          </Text>
        </FadeIn>
      ) : null}

      <Sheet
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        label={t('food.recipes.photo.sheetTitle')}
      >
        <Text className="mb-4 text-xl font-bold tracking-tight">
          {t('food.recipes.photo.sheetTitle')}
        </Text>
        <View className="gap-2">
          <SourceRow
            icon={Camera}
            label={t('food.recipes.photo.camera')}
            onPress={() => choose('camera')}
          />
          <SourceRow
            icon={ImagePlus}
            label={t('food.recipes.photo.library')}
            onPress={() => choose('library')}
          />
        </View>
      </Sheet>
    </View>
  );
}

function RoundAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: typeof Pencil;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      aria-label={label}
      hitSlop={6}
      className="bg-card/95 h-10 w-10 items-center justify-center rounded-full shadow-sm shadow-black/10 active:opacity-80"
    >
      <Icon as={icon} size={18} className="text-foreground" />
    </Pressable>
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
