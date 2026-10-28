'use client';

import { useTranslation } from '@aurora/i18n';
import {
  Button,
  ChartNoAxesColumn,
  cn,
  Icon,
  type IconComponent,
  MessageCircleHeart,
  Smile,
  Sparkles,
  Text,
} from '@aurora/ui';
import { ScrollView, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Pop } from '../../components/pop';
import { useAppRouter } from '../../lib/navigation';
import { AppTopBar } from '../shell/top-bar';

type Section = 'chat' | 'insights' | 'mood';

const ART: Record<Section, { icon: IconComponent; tile: string; iconClass: string }> = {
  chat: { icon: MessageCircleHeart, tile: 'bg-sage', iconClass: 'text-ivory' },
  insights: { icon: ChartNoAxesColumn, tile: 'bg-primary', iconClass: 'text-primary-foreground' },
  mood: { icon: Smile, tile: 'bg-taupe', iconClass: 'text-olive' },
};

/**
 * Stand-in for a section that's scheduled but not built yet, so navigation can be tried end to
 * end. Each one is replaced by its real screen in its phase.
 */
function ComingSoon({ section, standalone = false }: { section: Section; standalone?: boolean }) {
  const { t } = useTranslation();
  const router = useAppRouter();
  const art = ART[section];

  return (
    <View className="bg-background flex-1">
      {/* Standalone screens sit outside the shell, so they draw the fixed bar (with back) here. */}
      {standalone ? <AppTopBar back /> : null}
      <ScrollView className="flex-1" contentContainerClassName="flex-grow px-6 pb-10 pt-3">
        <View className="mx-auto w-full max-w-md flex-1 items-center justify-center gap-6 py-10">
          <Pop appear>
            <View className={cn('h-24 w-24 items-center justify-center rounded-[32px]', art.tile)}>
              <Icon as={art.icon} size={44} strokeWidth={1.75} className={art.iconClass} />
            </View>
          </Pop>
          <FadeIn delay={120} className="items-center gap-3">
            <View className="bg-sage/15 flex-row items-center gap-1.5 rounded-full px-3 py-1">
              <Icon as={Sparkles} size={14} className="text-muted-foreground" />
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t('shell.soon')}
              </Text>
            </View>
            <Text variant="h3" className="text-center">
              {t(`placeholders.${section}.title`)}
            </Text>
            <Text className="text-muted-foreground text-center leading-6">
              {t(`placeholders.${section}.body`)}
            </Text>
          </FadeIn>
          <FadeIn delay={220}>
            <Button variant="outline" className="rounded-full" onPress={() => router.navigate('/')}>
              <Text>{t('placeholders.backHome')}</Text>
            </Button>
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  );
}

export const ChatScreen = () => <ComingSoon section="chat" />;
export const InsightsScreen = () => <ComingSoon section="insights" />;
export const MoodScreen = () => <ComingSoon section="mood" standalone />;
