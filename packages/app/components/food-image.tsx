import { cn } from '@aurora/ui';
import { useState } from 'react';
import { View } from 'react-native';
import type { FoodImageProps } from './food-image-types';

/**
 * A food photo that fills its box. Web: a lazy-loaded <img> (the browser caches it), faded in
 * once decoded. Shows `fallback` while there's no photo or it fails to load.
 * Native twin: food-image.native.tsx (expo-image).
 */
export function FoodImage({ uri, fallback, className }: FoodImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <>{fallback}</>;
  return (
    <View className={className}>
      <View className="absolute inset-0 items-center justify-center">{fallback}</View>
      <img
        src={uri}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </View>
  );
}
