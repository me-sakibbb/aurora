'use client';

import { photoUrl } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { cn, Icon, Input, Text } from '@mybela/ui';
import { Pressable, View } from 'react-native';
import { tapHaptic } from '../../../../lib/haptics';
import { FormField } from '../../../auth/components/form';
import { methodLabel } from '../../display';
import { COOKING_METHODS, methodIcon } from '../../method-icons';
import { PhotoPicker } from '../components/photo-picker';
import type { RecipeDraft } from '../draft-store';

/** Step 1: the photo (optional), both names and how it's cooked. */
export function BasicsStep({
  draft,
  update,
  photoNotice,
  showErrors,
}: {
  draft: RecipeDraft;
  update: (patch: Partial<RecipeDraft>) => void;
  photoNotice: string | null;
  showErrors: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-6">
      <PhotoPicker
        uri={draft.photo?.uri ?? photoUrl(draft.photoUrl)}
        method={draft.method}
        onPick={(photo) => update({ photo })}
        onRemove={() => update({ photo: null, photoUrl: null })}
        notice={photoNotice}
      />

      <FormField
        label={t('food.recipes.name.label')}
        error={showErrors && !draft.name.trim() ? t('food.recipes.name.required') : undefined}
      >
        <Input
          invalid={showErrors && !draft.name.trim()}
          value={draft.name}
          onChangeText={(name) => update({ name })}
          placeholder={t('food.recipes.name.placeholder')}
          aria-label={t('food.recipes.name.label')}
          autoCapitalize="words"
          maxLength={120}
          returnKeyType="next"
        />
      </FormField>

      <FormField label={t('food.recipes.name.bnLabel')}>
        <Input
          value={draft.nameBn}
          onChangeText={(nameBn) => update({ nameBn })}
          placeholder={t('food.recipes.name.bnPlaceholder')}
          aria-label={t('food.recipes.name.bnLabel')}
          autoCorrect={false}
          maxLength={120}
        />
      </FormField>

      <View className="gap-3">
        <View className="gap-0.5">
          <Text className="font-semibold">{t('food.recipes.method.label')}</Text>
          <Text className="text-muted-foreground text-sm">{t('food.recipes.method.hint')}</Text>
        </View>
        <View
          role="radiogroup"
          aria-label={t('food.recipes.method.label')}
          className="-mx-1 flex-row flex-wrap"
        >
          {COOKING_METHODS.map((method) => {
            const selected = draft.method === method;
            const label = methodLabel(t, method);
            return (
              <View key={method} className="w-1/4 p-1">
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    update({ method });
                  }}
                  role="radio"
                  aria-checked={selected}
                  aria-label={label}
                  className="items-center gap-1.5 py-1 active:opacity-80"
                >
                  <View
                    className={cn(
                      'h-14 w-14 items-center justify-center rounded-full border',
                      selected ? 'bg-primary border-primary' : 'bg-card border-border',
                    )}
                  >
                    <Icon
                      as={methodIcon(method)}
                      size={24}
                      strokeWidth={1.75}
                      className={selected ? 'text-primary-foreground' : 'text-primary'}
                    />
                  </View>
                  <Text
                    numberOfLines={2}
                    className={cn(
                      'text-center text-xs leading-4',
                      selected ? 'text-foreground font-bold' : 'text-muted-foreground font-medium',
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        {showErrors && !draft.method ? (
          <Text className="text-destructive text-sm" role="alert">
            {t('food.recipes.method.required')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
