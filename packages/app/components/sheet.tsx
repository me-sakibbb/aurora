'use client';

import { useTranslation } from '@aurora/i18n';
import { cn } from '@aurora/ui';
import { cssInterop } from 'nativewind';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useInsets } from '../lib/insets';
import { useScrollLock } from '../lib/scroll-lock';
import { useReducedMotion } from '../lib/use-reduced-motion';

cssInterop(Animated.View, { className: 'style' });

const useNativeDriver = Platform.OS !== 'web';

/** Tailwind's `lg` breakpoint: from here the sheet is a centered dialog and can't be swiped. */
const LG = 1024;
/** How far (px) or how fast (px/ms) a downward swipe must go to close the sheet. */
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.8;

/** The sheet's scroll position, so a downward swipe scrolls content first and closes only at the top. */
const ScrollTopContext = createContext<{ current: number } | null>(null);

/** A ScrollView for sheet content: swiping down closes the sheet only once it's scrolled to the top. */
export function SheetScrollView({ onScroll, ...props }: ScrollViewProps) {
  const scrollTop = useContext(ScrollTopContext);
  return (
    <ScrollView
      scrollEventThrottle={16}
      {...props}
      onScroll={(event) => {
        if (scrollTop) scrollTop.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
    />
  );
}

/**
 * A bottom sheet on phones, a centered dialog on wide screens (`lg`). The backdrop fades while the
 * panel springs up; closing plays it back before unmounting. Back button / Esc / backdrop close it,
 * and on phones so does swiping it down.
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
  const drag = useRef(new Animated.Value(0)).current;
  const scrollTop = useRef(0);
  const { width } = useWindowDimensions();
  useScrollLock(mounted);

  // Read through refs so the responder, created once, always sees the latest values.
  const swipeable = useRef(false);
  swipeable.current = width < LG;
  const close = useRef(onClose);
  close.current = onClose;

  const pan = useRef(
    PanResponder.create({
      // Capture only a clearly downward drag while the content is at its top; anything else
      // (taps, horizontal moves, scrolling back up) stays with the content.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        swipeable.current &&
        scrollTop.current <= 0 &&
        g.dy > 8 &&
        Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) {
          close.current();
          return;
        }
        Animated.spring(drag, { toValue: 0, friction: 9, tension: 120, useNativeDriver }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: 0, friction: 9, tension: 120, useNativeDriver }).start(),
    }),
  ).current;

  useEffect(() => {
    if (open) {
      drag.setValue(0);
      scrollTop.current = 0;
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
  }, [open, progress, drag, reduced]);

  // Closing after a swipe carries on from wherever the finger let go.
  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }),
    drag,
  );

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
          {...pan.panHandlers}
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
          <ScrollTopContext.Provider value={scrollTop}>{children}</ScrollTopContext.Provider>
        </Animated.View>
      </View>
    </Modal>
  );
}
