'use client';

import { useTranslation } from '@mybela/i18n';
import { Camera, Icon } from '@mybela/ui';
import { Pressable } from 'react-native';
import { tapHaptic } from '../../../lib/haptics';

/** The camera inside the food search box: opens snap a meal. */
export function SnapButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      role="button"
      aria-label={t('food.snap.open')}
      hitSlop={6}
      className="bg-primary h-10 w-10 items-center justify-center rounded-full shadow-sm shadow-black/10 active:opacity-80"
    >
      <Icon as={Camera} size={19} className="text-primary-foreground" />
    </Pressable>
  );
}
