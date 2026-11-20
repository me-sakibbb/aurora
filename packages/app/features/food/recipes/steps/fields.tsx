'use client';

import { cn, Icon, Input, Minus, Plus, Text } from '@mybela/ui';
import { type Ref, useEffect, useState } from 'react';
import { Pressable, type TextInput, View } from 'react-native';
import { tapHaptic } from '../../../../lib/haptics';

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * A typed amount as a number: Bengali digits and a comma decimal are accepted, since both are
 * common on Bangladeshi keyboards. `null` for an empty, zero or unreadable value.
 */
export function parseAmount(text: string): number | null {
  const ascii = text
    .replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)))
    .replace(',', '.')
    .trim();
  if (!/^\d*\.?\d+$|^\d+\.$/.test(ascii)) return null;
  const value = Number(ascii);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const formatAmount = (value: number | null) =>
  value == null ? '' : String(Math.round(value * 10) / 10);

/**
 * A grams field that keeps what's being typed (e.g. "12.") while reporting the number. Follows
 * outside changes (the −/+ buttons) without fighting the cursor.
 */
export function AmountInput({
  value,
  onChange,
  label,
  inputRef,
  className,
  invalid,
  suffix = 'g',
  big,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  inputRef?: Ref<TextInput>;
  className?: string;
  invalid?: boolean;
  suffix?: string;
  big?: boolean;
}) {
  const [text, setText] = useState(() => formatAmount(value));
  useEffect(() => {
    setText((current) => (parseAmount(current) === value ? current : formatAmount(value)));
  }, [value]);

  return (
    <View className={cn('relative justify-center', className)}>
      <Input
        ref={inputRef}
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChange(parseAmount(next));
        }}
        aria-label={label}
        inputMode="decimal"
        keyboardType="decimal-pad"
        selectTextOnFocus
        invalid={invalid}
        className={cn('pr-9 text-right', big && 'h-16 rounded-2xl pr-12 text-2xl font-bold')}
      />
      <Text
        pointerEvents="none"
        className={cn(
          'text-muted-foreground absolute right-3',
          big ? 'right-4 text-lg font-semibold' : 'text-sm',
        )}
      >
        {suffix}
      </Text>
    </View>
  );
}

/** A round −/+ button. */
export function StepButton({
  kind,
  label,
  onPress,
  disabled,
  big,
}: {
  kind: 'less' | 'more';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      disabled={disabled}
      role="button"
      aria-label={label}
      hitSlop={4}
      className={cn(
        'bg-background border-border items-center justify-center rounded-full border active:opacity-70',
        big ? 'h-14 w-14' : 'h-10 w-10',
        disabled && 'opacity-40',
      )}
    >
      <Icon as={kind === 'less' ? Minus : Plus} size={big ? 22 : 16} className="text-foreground" />
    </Pressable>
  );
}

/** The step's heading and one line of help. */
export function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-1">
      <Text role="heading" aria-level={2} className="text-2xl font-bold tracking-tight">
        {title}
      </Text>
      {subtitle ? <Text className="text-muted-foreground leading-6">{subtitle}</Text> : null}
    </View>
  );
}
