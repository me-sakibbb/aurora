import { Text } from '@aurora/ui/components/text';
import { cn } from '@aurora/ui/lib/utils';
import type * as React from 'react';

/**
 * Visible field label. react-native-web renders Text as a <div>, not a <label>, so also give the
 * input an `aria-label` with the same text for screen readers (works on web and native).
 */
function Label({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-foreground text-sm font-medium', className)} {...props} />;
}

export { Label };
