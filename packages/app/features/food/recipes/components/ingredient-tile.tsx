'use client';

import { Carrot, cn, Icon } from '@mybela/ui';
import { View } from 'react-native';
import { FoodImage } from '../../../../components/food-image';

/**
 * An ingredient's square photo. Ingredients have no photos in the backend yet (proposed
 * `image_url`), so this shows a soft tile with an ingredient icon until they do.
 */
export function IngredientTile({
  uri,
  size = 'md',
}: {
  uri: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg'
      ? 'h-16 w-16 rounded-2xl'
      : size === 'sm'
        ? 'h-9 w-9 rounded-xl'
        : 'h-12 w-12 rounded-2xl';
  const icon = size === 'lg' ? 28 : size === 'sm' ? 16 : 20;
  return (
    <View aria-hidden className={cn('bg-sage/15 items-center justify-center overflow-hidden', box)}>
      <FoodImage
        uri={uri}
        className="absolute inset-0"
        fallback={<Icon as={Carrot} size={icon} strokeWidth={1.75} className="text-primary/70" />}
      />
    </View>
  );
}
