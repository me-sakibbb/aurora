'use client';

import { useTranslation } from '@aurora/i18n';
import {
  ChevronRight,
  cn,
  Icon,
  type IconComponent,
  MessageCircleHeart,
  Smile,
  Text,
  Utensils,
} from '@aurora/ui';
import { Pressable, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Sheet } from '../../components/sheet';
import { tapHaptic } from '../../lib/haptics';
import { useAppRouter } from '../../lib/navigation';
import { useSheets } from './sheets';

type Action = {
  key: 'food' | 'mood' | 'chat';
  href: string;
  icon: IconComponent;
  tile: string;
  iconClass: string;
};

const ACTIONS: Action[] = [
  {
    key: 'food',
    href: '/food',
    icon: Utensils,
    tile: 'bg-primary',
    iconClass: 'text-primary-foreground',
  },
  { key: 'mood', href: '/mood', icon: Smile, tile: 'bg-taupe', iconClass: 'text-olive' },
  {
    key: 'chat',
    href: '/chat',
    icon: MessageCircleHeart,
    tile: 'bg-sage',
    iconClass: 'text-ivory',
  },
];

/** "What would you like to log?": the central + button's sheet (food, mood, ask Aurora). */
export function QuickLogSheet() {
  const { t } = useTranslation();
  const router = useAppRouter();
  const open = useSheets((s) => s.open === 'quickLog');
  const close = useSheets((s) => s.close);

  return (
    <Sheet open={open} onClose={close} label={t('shell.quickLog.title')}>
      <Text className="mb-1 text-xl font-bold tracking-tight">{t('shell.quickLog.title')}</Text>
      <Text variant="muted" className="mb-5">
        {t('shell.quickLog.subtitle')}
      </Text>
      <View className="gap-2.5">
        {ACTIONS.map((action, index) => (
          <FadeIn key={action.key} delay={open ? 60 + index * 50 : 0}>
            <Pressable
              onPress={() => {
                tapHaptic();
                close();
                router.navigate(action.href);
              }}
              className="bg-background border-border active:bg-muted hover:bg-muted flex-row items-center gap-4 rounded-2xl border p-3.5"
            >
              <View
                className={cn('h-12 w-12 items-center justify-center rounded-2xl', action.tile)}
              >
                <Icon as={action.icon} size={24} className={action.iconClass} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold">
                  {t(`shell.quickLog.${action.key}.title`)}
                </Text>
                <Text variant="muted">{t(`shell.quickLog.${action.key}.body`)}</Text>
              </View>
              <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </Sheet>
  );
}
