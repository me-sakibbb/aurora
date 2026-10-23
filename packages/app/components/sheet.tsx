'use client';

import { useTranslation } from '@aurora/i18n';
import { cn } from '@aurora/ui';
import { cssInterop } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, View } from 'react-native';
import { useInsets } from '../lib/insets';
import { useReducedMotion } from '../lib/use-reduced-motion';

cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/**
 * A bottom sheet on phones, a centered dialog on wide screens (`lg`). The backdrop fades while the
 * panel springs up; closing plays it back before unmounting. Back button / Esc / backdrop close it.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  className,
  flush = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Edge-to-edge content (e.g. a hero photo): no padding, and the drag handle floats over the top.
   * The content handles its own padding and bottom inset.
   */
  flush?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      const animation = reduced
        ? Animated.timing(progress, { toValue: 1, duration: 0, useNativeDriver })
        : Animated.spring(progress, { toValue: 1, friction: 10, tension: 90, useNativeDriver });
      animation.start();
      return () => animation.stop();
    }
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: reduced ? 0 : 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver,
    });
    animation.start(({ finished }) => finished && setMounted(false));
    return () => animation.stop();
  }, [open, progress, reduced]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end lg:items-center lg:justify-center lg:p-6">
        <Animated.View style={{ opacity: progress }} className="bg-olive/50 absolute inset-0">
          <Pressable
            className="flex-1"
            onPress={onClose}
            aria-label={t('common.close')}
            role="button"
          />
        </Animated.View>
        <Animated.View
          role="dialog"
          aria-modal
          aria-label={label}
          style={{
            transform: [{ translateY }],
            paddingBottom: flush ? 0 : Math.max(insets.bottom, 16) + 8,
          }}
          className={cn(
            'bg-card w-full rounded-t-[28px] px-5 pt-3 shadow-2xl shadow-black/30 lg:max-w-md lg:rounded-[28px] lg:pt-6',
            flush && 'overflow-hidden px-0 pt-0 lg:pt-0',
            className,
          )}
        >
          {flush ? (
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 top-2.5 z-10 items-center lg:hidden"
            >
              <View className="bg-card/80 h-1.5 w-10 rounded-full" />
            </View>
          ) : (
            <View className="bg-border mx-auto mb-5 h-1.5 w-10 rounded-full lg:hidden" />
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
