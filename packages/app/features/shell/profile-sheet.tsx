'use client';

import { useTranslation } from '@aurora/i18n';
import {
  ChevronRight,
  cn,
  Flower2,
  Icon,
  type IconComponent,
  Languages,
  LogOut,
  SlidersHorizontal,
  Target,
  Text,
} from '@aurora/ui';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Sheet } from '../../components/sheet';
import { useLanguage } from '../../lib/language';
import { useAppRouter } from '../../lib/navigation';
import { useSignOut } from '../auth/session';
import { useCycleAccess } from '../cycle/queries';
import { useProfile } from '../home/queries';
import { Avatar, useAccount } from './account';
import { useSheets } from './sheets';

/** F24 profile overlay: who's signed in, their goals and target (as returned), and shortcuts. */
export function ProfileSheet() {
  const { t } = useTranslation();
  const open = useSheets((s) => s.open === 'profile');
  const close = useSheets((s) => s.close);
  const show = useSheets((s) => s.show);
  const router = useAppRouter();
  const cycle = useCycleAccess();
  const { fullName, email } = useAccount();
  const profile = useProfile();
  const { language, setLanguage } = useLanguage();
  const signOut = useSignOut();

  const goals = profile.data?.goals ?? [];
  const target = profile.data?.target_kcal;

  return (
    <Sheet open={open} onClose={close} label={t('shell.profile.title')}>
      <View className="mb-5 flex-row items-center gap-4">
        <Avatar size="lg" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-xl font-bold tracking-tight">
            {fullName || t('shell.you')}
          </Text>
          <Text numberOfLines={1} variant="muted">
            {email}
          </Text>
        </View>
      </View>

      {goals.length > 0 || target ? (
        <View className="bg-background border-border mb-4 gap-3 rounded-2xl border p-4">
          {target ? (
            <View className="flex-row items-center gap-2">
              <Icon as={Target} size={18} className="text-accent" />
              <Text className="text-muted-foreground text-sm">{t('shell.profile.target')}</Text>
              <Text className="ml-auto text-sm font-semibold">
                {t('home.kcal', { value: Math.round(target).toLocaleString() })}
              </Text>
            </View>
          ) : null}
          {goals.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {goals.map((goal) => (
                <View key={goal} className="bg-sage/15 rounded-full px-3 py-1.5">
                  <Text className="text-xs font-medium">
                    {t(`onboarding.options.goal.${goal}`)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="border-border overflow-hidden rounded-2xl border">
        <Row
          icon={SlidersHorizontal}
          label={t('shell.profile.settings')}
          hint={t('shell.soon')}
          disabled
        />
        {cycle !== 'hidden' ? (
          <Row
            icon={Flower2}
            label={t('cycle.settings.profileRow')}
            hint={cycle === 'enabled' ? t('cycle.settings.on') : t('cycle.settings.off')}
            onPress={() => {
              // Opted in: edit the settings. Not yet: the Cycle tab asks the setup questions.
              if (cycle === 'enabled') {
                show('cycleSettings');
              } else {
                close();
                router.navigate('/cycle');
              }
            }}
            border
          />
        ) : null}
        <Row
          icon={Languages}
          label={t('shell.profile.language')}
          hint={t('common.languageToggle')}
          onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          border
        />
        <Row
          icon={LogOut}
          label={t('auth.signOut')}
          destructive
          busy={signOut.isPending}
          onPress={() => signOut.mutate(undefined, { onSuccess: close })}
          border
        />
      </View>
    </Sheet>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
  disabled,
  destructive,
  busy,
  border,
}: {
  icon: IconComponent;
  label: string;
  hint?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  busy?: boolean;
  border?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={cn(
        'bg-card active:bg-muted hover:bg-muted min-h-[52px] flex-row items-center gap-3 px-4',
        border && 'border-border border-t',
        disabled && 'opacity-60',
      )}
    >
      <Icon
        as={icon}
        size={20}
        className={destructive ? 'text-destructive' : 'text-muted-foreground'}
      />
      <Text className={cn('flex-1 font-medium', destructive && 'text-destructive')}>{label}</Text>
      {busy ? <ActivityIndicator className="text-muted-foreground" /> : null}
      {hint ? <Text className="text-muted-foreground text-sm">{hint}</Text> : null}
      {!destructive && !disabled ? (
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      ) : null}
    </Pressable>
  );
}
