import { cn } from '@aurora/ui/lib/utils';
import * as React from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps &
  React.RefAttributes<TextInput> & {
    /** Red outline + aria-invalid. Pair with a visible error message. */
    invalid?: boolean;
  };

// react-native-reusables Input, sized for touch (48px) and with a focus ring on native too
// (native has no :focus styles, so focus is tracked in state).
function Input({ className, invalid, onFocus, onBlur, editable, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <TextInput
      className={cn(
        'border-input bg-card text-foreground h-12 w-full min-w-0 flex-row items-center rounded-lg border px-4 font-sans text-base leading-5',
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-accent/30 outline-none transition-[color,box-shadow,border-color]',
            'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
          ),
          native: cn(
            'placeholder:text-muted-foreground/70',
            focused && 'border-ring border-2 px-[15px]',
          ),
        }),
        invalid && 'border-destructive',
        invalid &&
          Platform.select({
            web: 'focus-visible:border-destructive focus-visible:ring-destructive/20',
          }),
        editable === false && 'opacity-50',
        className,
      )}
      aria-invalid={invalid}
      editable={editable}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

export type { InputProps };
export { Input };
