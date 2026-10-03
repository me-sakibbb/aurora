'use client';

import { tracksCycle } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  BellRing,
  Button,
  CalendarHeart,
  Flame,
  Icon,
  type IconComponent,
  SlidersHorizontal,
  Text,
  Utensils,
} from '@aurora/ui';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BrandMark } from '../../../components/brand-mark';
import { requestNotificationPermission } from '../../../lib/notifications';
import { StepHeading } from '../components/layout';
import { HeroIcon } from '../components/visuals';
import type { StepDefinition, StepProps } from './types';

function Benefits({ items }: { items: [IconComponent, string][] }) {
  return (
    <View className="bg-card border-border gap-4 rounded-2xl border p-4 shadow-sm shadow-black/5">
      {items.map(([icon, text]) => (
        <View key={text} className="flex-row items-center gap-3">
          <View className="bg-sage/15 h-10 w-10 items-center justify-center rounded-xl">
            <Icon as={icon} size={20} className="text-primary" />
          </View>
          <Text className="flex-1 text-base leading-6">{text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Two choices; the primary one may do async work first. Shows a spinner while submitting. */
function ChoiceFooter({
  primary,
  secondary,
  onPrimary,
  onSecondary,
  busy,
  disabled,
}: {
  primary: string;
  secondary: string;
  onPrimary: () => void;
  onSecondary: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <>
      <Button size="lg" onPress={onPrimary} disabled={busy || disabled} aria-busy={busy}>
        {busy ? <ActivityIndicator size="small" className="text-primary-foreground" /> : null}
        <Text>{primary}</Text>
      </Button>
      <Button variant="ghost" size="lg" onPress={onSecondary} disabled={busy || disabled}>
        <Text>{secondary}</Text>
      </Button>
    </>
  );
}

/**
 * Explainer, then the OS permission prompt. Only the answer is saved for now; push token
 * registration is added once the backend has an endpoint for it (Phase 6).
 */
export const notificationsStep: StepDefinition = {
  Body: function NotificationsBody({ draft }) {
    const { t } = useTranslation();
    const items: [IconComponent, string][] = [[Utensils, t('onboarding.notifications.pointMeals')]];
    if (tracksCycle(draft)) items.push([CalendarHeart, t('onboarding.notifications.pointCycle')]);
    items.push([SlidersHorizontal, t('onboarding.notifications.pointControl')]);
    return (
      <>
        <HeroIcon icon={BellRing} />
        <StepHeading
          title={t('onboarding.notifications.title')}
          subtitle={t('onboarding.notifications.subtitle')}
        />
        <Benefits items={items} />
      </>
    );
  },
  Footer: function NotificationsFooter({ update, next, isLast, busy, online }: StepProps) {
    const { t } = useTranslation();
    const [asking, setAsking] = useState(false);

    async function enable() {
      setAsking(true);
      const result = await requestNotificationPermission(t('onboarding.notifications.channel'));
      setAsking(false);
      update({ notificationsEnabled: result === 'granted' });
      next();
    }

    return (
      <ChoiceFooter
        primary={t('onboarding.notifications.enable')}
        secondary={t('onboarding.notifications.notNow')}
        onPrimary={() => void enable()}
        onSecondary={() => {
          update({ notificationsEnabled: false });
          next();
        }}
        busy={asking || busy}
        disabled={isLast && !online}
      />
    );
  },
};

/**
 * Home-screen widget opt-in (Android only). Only the choice is recorded: the widget itself is
 * built later, once the backend provides the streak data it shows.
 */
export const widgetStep: StepDefinition = {
  Body: function WidgetBody() {
    const { t } = useTranslation();
    return (
      <>
        {/* Illustration of a home screen with the widget (no real data). */}
        <View aria-hidden className="items-center py-2">
          <View className="bg-primary w-56 gap-4 rounded-[36px] p-5 shadow-xl shadow-black/20">
            <View className="flex-row justify-between">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="bg-ivory/15 h-10 w-10 rounded-xl" />
              ))}
            </View>
            <View className="bg-card gap-2 rounded-3xl p-4">
              <View className="flex-row items-center gap-2">
                <BrandMark />
                <Text className="text-muted-foreground text-xs font-semibold">
                  {t('common.appName')}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Icon as={Flame} size={26} className="text-accent" />
                <Text className="text-2xl font-semibold">
                  {t('onboarding.widget.previewStreak')}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="bg-ivory/15 h-10 w-10 rounded-xl" />
              ))}
            </View>
          </View>
        </View>
        <StepHeading
          title={t('onboarding.widget.title')}
          subtitle={t('onboarding.widget.subtitle')}
        />
      </>
    );
  },
  Footer: function WidgetFooter({ update, next, isLast, busy, online }: StepProps) {
    const { t } = useTranslation();
    return (
      <ChoiceFooter
        primary={t('onboarding.widget.yes')}
        secondary={t('onboarding.widget.no')}
        onPrimary={() => {
          update({ widgetEnabled: true });
          next();
        }}
        onSecondary={() => {
          update({ widgetEnabled: false });
          next();
        }}
        busy={busy}
        disabled={isLast && !online}
      />
    );
  },
};
