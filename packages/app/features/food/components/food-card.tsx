'use client';

import type { FoodItem } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import { cn, Icon, Text } from '@aurora/ui';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { FoodImage } from '../../../components/food-image';
import { useLanguage } from '../../../lib/language';
import { foodNames, highlightParts, kcalLabel, methodLabel } from '../display';
import { methodIcon } from '../method-icons';

/**
 * One food as a card: its photo (or a cooking-method icon until photos exist), both names, the
 * cooking method and the backend's calorie figure. What matched the search is bolded.
 */
export const FoodCard = memo(function FoodCard({
  item,
  query,
  onPress,
}: {
  item: FoodItem;
  query: string;
  onPress: (item: FoodItem) => void;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { primary, secondary } = foodNames(item, language);
  const method = methodLabel(t, item.cooking_method);
  const kcal = kcalLabel(t, item);

  return (
    <Pressable
      onPress={() => onPress(item)}
      aria-label={[primary, secondary, method, kcal].filter(Boolean).join(', ')}
      className="bg-card border-border flex-1 overflow-hidden rounded-3xl border shadow-sm shadow-black/5 transition-transform hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <View className="bg-sage/15 aspect-[4/3] w-full items-center justify-center">
        <FoodImage
          uri={item.image_url}
          className="absolute inset-0"
          fallback={
            <Icon
              as={methodIcon(item.cooking_method)}
              size={36}
              strokeWidth={1.5}
              className="text-primary/70"
            />
          }
        />
        {kcal ? (
          <View className="bg-card/95 absolute bottom-2 left-2 rounded-full px-2.5 py-1 shadow-sm shadow-black/10">
            <Text className="text-foreground text-[11px] font-semibold">{kcal}</Text>
          </View>
        ) : null}
      </View>
      <View className="flex-1 gap-1 px-3 pb-3.5 pt-2.5">
        <Text className="text-[15px] leading-5" numberOfLines={2}>
          {highlightParts(primary, query).map((part, index) => (
            <Text
              key={index}
              className={cn('text-[15px]', part.match ? 'font-bold' : 'font-semibold')}
            >
              {part.text}
            </Text>
          ))}
        </Text>
        {secondary ? (
          <Text className="text-muted-foreground text-[13px] leading-5" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
        <Text className="text-muted-foreground mt-auto pt-1 text-[11px] font-semibold uppercase tracking-wider">
          {method}
        </Text>
      </View>
    </Pressable>
  );
});
