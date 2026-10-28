'use client';

import { useTranslation } from '@aurora/i18n';
import { Pressable } from 'react-native';
import { Avatar } from './account';
import { useSheets } from './sheets';

/**
 * The avatar at the end of every screen's top bar; opens the profile sheet (F24). Hidden on wide
 * screens, where the sidebar shows it instead.
 */
export function ProfileButton() {
  const { t } = useTranslation();
  const showSheet = useSheets((s) => s.show);
  return (
    <Pressable
      onPress={() => showSheet('profile')}
      aria-label={t('shell.openProfile')}
      className="rounded-full active:opacity-80 lg:hidden"
    >
      <Avatar />
    </Pressable>
  );
}
