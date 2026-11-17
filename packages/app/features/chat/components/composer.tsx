'use client';

import { CHAT_MESSAGE_MAX } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { ArrowUp, cn, Icon, Text, WifiOff } from '@mybela/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, TextInput, View } from 'react-native';

cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/**
 * Where a message is written: grows with the text up to a few lines, Enter sends on a computer
 * (Shift+Enter for a new line). The send button wakes up once there's something to send.
 */
export function Composer({
  value,
  onChange,
  onSend,
  busy,
  online,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** A reply is on its way; one question at a time. */
  busy: boolean;
  online: boolean;
}) {
  const { t } = useTranslation();
  const ready = value.trim().length > 0 && !busy && online;
  const scale = useRef(new Animated.Value(ready ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: ready ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start();
  }, [ready, scale]);

  const nearLimit = value.length > CHAT_MESSAGE_MAX - 200;

  return (
    <View className="gap-1.5">
      {!online ? (
        <View className="flex-row items-center gap-1.5 px-2" role="status">
          <Icon as={WifiOff} size={13} className="text-muted-foreground" />
          <Text className="text-muted-foreground text-xs">{t('chat.composer.offline')}</Text>
        </View>
      ) : null}
      <View className="bg-card border-border flex-row items-end gap-2 rounded-[26px] border py-1.5 pl-4 pr-1.5 shadow-sm shadow-black/5">
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={t('chat.composer.placeholder')}
          aria-label={t('chat.composer.label')}
          multiline
          maxLength={CHAT_MESSAGE_MAX}
          textAlignVertical="center"
          // Web: Enter sends, Shift+Enter breaks the line.
          onKeyPress={
            Platform.OS === 'web'
              ? (event) => {
                  const native = event.nativeEvent as unknown as {
                    key: string;
                    shiftKey?: boolean;
                    isComposing?: boolean;
                  };
                  if (native.key === 'Enter' && !native.shiftKey && !native.isComposing) {
                    event.preventDefault();
                    if (ready) onSend();
                  }
                }
              : undefined
          }
          className={cn(
            'text-foreground placeholder:text-muted-foreground max-h-[132px] min-h-[40px] flex-1 py-2 text-base leading-6',
            Platform.select({ web: 'outline-none' }),
          )}
        />
        <Pressable
          onPress={onSend}
          disabled={!ready}
          role="button"
          aria-label={t('chat.composer.send')}
          aria-disabled={!ready}
          className="h-10 w-10 items-center justify-center"
        >
          <View className="bg-muted absolute h-10 w-10 rounded-full" />
          <Animated.View
            className="bg-primary absolute h-10 w-10 rounded-full"
            style={{
              opacity: scale,
              transform: [
                { scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}
          />
          <Icon
            as={ArrowUp}
            size={20}
            strokeWidth={2.25}
            className={ready ? 'text-primary-foreground' : 'text-muted-foreground'}
          />
        </Pressable>
      </View>
      {nearLimit ? (
        <Text className="text-muted-foreground px-3 text-right text-xs">
          {t('chat.composer.count', { count: value.length, max: CHAT_MESSAGE_MAX })}
        </Text>
      ) : null}
    </View>
  );
}
