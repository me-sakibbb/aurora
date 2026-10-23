'use client';

import { useTranslation } from '@aurora/i18n';
import { Icon, Input, Search, X } from '@aurora/ui';
import type { Ref } from 'react';
import { ActivityIndicator, Pressable, type TextInput, View } from 'react-native';

/**
 * The search box: big, round and forgiving. Autocorrect and capitalisation are off so Bengali and
 * Banglish are left exactly as typed (F23).
 */
export function SearchField({
  value,
  onChangeText,
  onSubmit,
  busy,
  autoFocus,
  inputRef,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  /** The backend is still answering: a small spinner where the clear button sits. */
  busy?: boolean;
  autoFocus?: boolean;
  inputRef?: Ref<TextInput>;
}) {
  const { t } = useTranslation();

  return (
    <View className="relative justify-center">
      <View pointerEvents="none" className="absolute left-4 z-10">
        <Icon as={Search} size={20} className="text-muted-foreground" />
      </View>
      <Input
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={t('food.search.placeholder')}
        aria-label={t('food.search.label')}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        returnKeyType="search"
        enterKeyHint="search"
        inputMode="search"
        className="h-14 rounded-full pl-12 pr-20 shadow-sm shadow-black/5"
      />
      {value.length > 0 ? (
        <View className="absolute right-3 z-10 flex-row items-center gap-1.5">
          {busy ? (
            <ActivityIndicator
              size="small"
              aria-label={t('food.search.searching')}
              className="text-muted-foreground"
            />
          ) : null}
          <Pressable
            role="button"
            aria-label={t('food.search.clear')}
            onPress={() => onChangeText('')}
            hitSlop={8}
            className="bg-muted hover:bg-muted/70 active:bg-muted/70 h-8 w-8 items-center justify-center rounded-full"
          >
            <Icon as={X} size={16} strokeWidth={2.5} className="text-muted-foreground" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
