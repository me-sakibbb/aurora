import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';
import { useState } from 'react';
import { View } from 'react-native';
import type { FoodImageProps } from './food-image-types';

cssInterop(Image, { className: 'style' });

/**
 * A food photo that fills its box. expo-image caches to memory and disk (photos stay put offline
 * and on patchy data) and fades in. Shows `fallback` while there's no photo or it fails to load.
 * Web twin: food-image.tsx.
 */
export function FoodImage({ uri, fallback, className }: FoodImageProps) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <>{fallback}</>;
  return (
    <View className={className}>
      <View className="absolute inset-0 items-center justify-center">{fallback}</View>
      <Image
        source={{ uri }}
        recyclingKey={uri}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessible={false}
        onError={() => setFailed(true)}
        className="absolute inset-0"
      />
    </View>
  );
}
