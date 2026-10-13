'use client';

import { cn, Text } from '@aurora/ui';
import { View } from 'react-native';
import { useSession } from '../auth/session';
import { useProfile } from '../home/queries';

/** The signed-in person's display name (profile → Google name → email), first name, and email. */
export function useAccount() {
  const session = useSession();
  const profile = useProfile().data;
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const email = session?.user.email ?? '';
  const fullName = profile?.display_name || meta.full_name || meta.name || '';
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  const initial = (fullName || email).trim().charAt(0).toUpperCase() || 'A';
  return { fullName, firstName, email, initial };
}

const SIZES = {
  sm: { box: 'h-10 w-10', text: 'text-base' },
  lg: { box: 'h-16 w-16', text: 'text-2xl' },
} as const;

/** A round initial avatar (no photos in scope). */
export function Avatar({
  size = 'sm',
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { initial } = useAccount();
  const s = SIZES[size];
  return (
    <View
      aria-hidden
      className={cn('bg-taupe items-center justify-center rounded-full', s.box, className)}
    >
      <Text className={cn('text-olive font-bold', s.text)}>{initial}</Text>
    </View>
  );
}
