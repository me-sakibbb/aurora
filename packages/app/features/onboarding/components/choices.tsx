'use client';

import { Check, cn, Icon, type IconComponent, Text } from '@aurora/ui';
import { Platform, Pressable, View } from 'react-native';
import { Pop } from '../../../components/pop';
import { tapHaptic } from '../../../lib/haptics';
import { IconBadge } from './visuals';

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconComponent;
  /** Custom illustration instead of an icon; gets the selected state. */
  visual?: (selected: boolean) => React.ReactNode;
};

/**
 * A set of tappable answer cards. `multiple` makes them checkboxes, otherwise a radio group.
 * `layout="grid"` gives two-column tiles (icon on top); `list` gives full-width rows.
 */
export function Choices<T extends string>({
  label,
  choices,
  selected,
  onToggle,
  multiple = false,
  layout = 'list',
}: {
  /** Accessible name of the group (usually the question). */
  label: string;
  choices: Choice<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
  layout?: 'list' | 'grid';
}) {
  const grid = layout === 'grid';
  return (
    <View
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={label}
      className={cn(grid ? 'flex-row flex-wrap justify-between gap-y-3' : 'gap-3')}
    >
      {choices.map((choice) => {
        const isSelected = selected.includes(choice.value);
        const leading = choice.visual ? (
          choice.visual(isSelected)
        ) : choice.icon ? (
          <IconBadge icon={choice.icon} selected={isSelected} size={grid ? 'lg' : 'md'} />
        ) : null;
        return (
          <Pressable
            key={choice.value}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={isSelected}
            aria-label={choice.description ? `${choice.label}. ${choice.description}` : undefined}
            onPress={() => {
              tapHaptic();
              onToggle(choice.value);
            }}
            className={cn(
              'bg-card rounded-2xl border shadow-sm shadow-black/5 active:scale-[0.98] active:opacity-90',
              !isSelected && Platform.select({ web: 'hover:border-input transition-colors' }),
              grid
                ? 'w-[48.5%] items-center gap-3 px-3 pb-4 pt-5'
                : 'min-h-16 flex-row items-center gap-3.5 px-4 py-3',
              isSelected ? 'border-primary border-2' : 'border-border border-2',
            )}
          >
            {leading ? <Pop active={isSelected}>{leading}</Pop> : null}
            <View className={cn('gap-0.5', grid ? 'items-center' : 'flex-1')}>
              <Text
                className={cn('text-base font-medium leading-5', grid && 'text-center')}
                numberOfLines={3}
              >
                {choice.label}
              </Text>
              {choice.description ? (
                <Text
                  className={cn(
                    'text-muted-foreground text-sm leading-5',
                    grid && 'text-center text-xs leading-4',
                  )}
                >
                  {choice.description}
                </Text>
              ) : null}
            </View>
            {grid ? (
              <View className="absolute right-2.5 top-2.5">
                <Tick selected={isSelected} square={multiple} />
              </View>
            ) : (
              <Tick selected={isSelected} square={multiple} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function Tick({ selected, square }: { selected: boolean; square: boolean }) {
  return (
    <View
      aria-hidden
      className={cn(
        'h-6 w-6 items-center justify-center border-2',
        square ? 'rounded-md' : 'rounded-full',
        selected ? 'border-primary bg-primary' : 'border-border bg-background',
      )}
    >
      {selected ? (
        <Pop appear>
          <Icon as={Check} size={14} strokeWidth={3} className="text-primary-foreground" />
        </Pop>
      ) : null}
    </View>
  );
}

/** Single-select helper. Tapping the chosen option again still calls `onChange` (to move on). */
export function SingleChoice<T extends string>({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Choices<T>>, 'selected' | 'onToggle' | 'multiple'> & {
  value: T | undefined | null;
  onChange: (value: T) => void;
}) {
  return <Choices {...props} selected={value ? [value] : []} onToggle={onChange} />;
}
