'use client';

import { ApiError } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { Button, Icon, Text, Trash2 } from '@mybela/ui';
import { ActivityIndicator, View } from 'react-native';
import { FadeIn } from '../../../../components/fade-in';
import { useIsOnline } from '../../../../lib/use-online';
import { useDeleteRecipe } from '../queries';

/**
 * Asked inside the detail sheet (never a browser dialog). A recipe that's in the food log can't
 * be deleted (409); that's said plainly and the recipe stays.
 */
export function DeleteRecipeConfirm({
  id,
  name,
  onCancel,
  onDeleted,
}: {
  id: string;
  name: string;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const online = useIsOnline();
  const remove = useDeleteRecipe();
  const inLog = remove.error instanceof ApiError && remove.error.status === 409;

  return (
    <FadeIn className="bg-destructive/5 border-destructive/20 gap-4 rounded-3xl border p-5">
      <View className="flex-row items-center gap-3">
        <View className="bg-destructive/10 h-10 w-10 items-center justify-center rounded-full">
          <Icon as={Trash2} size={18} className="text-destructive" />
        </View>
        <Text className="flex-1 text-lg font-bold">{t('food.recipes.delete.title')}</Text>
      </View>
      <Text className="text-muted-foreground leading-6">
        {t('food.recipes.delete.body', { name })}
      </Text>
      {remove.isError || !online ? (
        <Text className="text-destructive text-sm" role="alert">
          {!online
            ? t('food.recipes.delete.offline')
            : inLog
              ? t('food.recipes.delete.inLog')
              : t('food.recipes.delete.error')}
        </Text>
      ) : null}
      <View className="flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          disabled={remove.isPending}
          onPress={onCancel}
        >
          <Text>{t('food.recipes.delete.keep')}</Text>
        </Button>
        <Button
          variant="destructive"
          className="flex-1 rounded-full"
          disabled={!online || remove.isPending || inLog}
          onPress={() => remove.mutate(id, { onSuccess: onDeleted })}
        >
          {remove.isPending ? <ActivityIndicator className="text-destructive-foreground" /> : null}
          <Text>
            {remove.isPending
              ? t('food.recipes.delete.deleting')
              : t('food.recipes.delete.confirm')}
          </Text>
        </Button>
      </View>
    </FadeIn>
  );
}
