import { cn, Icon, Sparkles } from '@mybela/ui';
import { View } from 'react-native';

/** MyBela's small mark beside its replies. */
export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <View
      aria-hidden
      className={cn('bg-primary h-7 w-7 items-center justify-center rounded-[10px]', className)}
    >
      <Icon as={Sparkles} size={14} strokeWidth={2} className="text-primary-foreground" />
    </View>
  );
}
