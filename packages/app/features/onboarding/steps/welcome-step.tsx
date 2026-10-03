'use client';

import { useTranslation } from '@aurora/i18n';
import {
  Button,
  CalendarHeart,
  Check,
  cn,
  EyeOff,
  Icon,
  type IconComponent,
  Lock,
  ShieldCheck,
  Smile,
  Soup,
  Text,
  Utensils,
  Wheat,
  WifiOff,
} from '@aurora/ui';
import { View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';
import { useAppRouter } from '../../../lib/navigation';
import type { StepDefinition } from './types';

/** Landing page: what Aurora is, before any question. One call to action. */
export const welcomeStep: StepDefinition = {
  wide: true,
  Body: function WelcomeBody({ next }) {
    const { t } = useTranslation();
    return (
      <View className="gap-14 pb-4 lg:gap-24 lg:pb-16">
        {/* Hero */}
        <View className="gap-10 lg:flex-row lg:items-center lg:gap-16 lg:pt-10">
          <View className="gap-6 lg:flex-1">
            <Text
              role="heading"
              aria-level={1}
              className="text-[34px] font-semibold leading-[42px] tracking-tight lg:text-6xl lg:leading-[68px]"
            >
              {t('onboarding.welcome.headline')}
            </Text>
            <Text className="text-muted-foreground text-lg leading-7 lg:max-w-xl lg:text-xl lg:leading-8">
              {t('onboarding.welcome.body')}
            </Text>
            <View className="hidden gap-3 pt-2 lg:flex lg:flex-row lg:items-center">
              <WelcomeActions onStart={next} inline />
            </View>
          </View>
          <View className="lg:flex-1">
            <AppPreview />
          </View>
        </View>

        {/* What it does */}
        <Section title={t('onboarding.welcome.featuresTitle')}>
          <View className="gap-4 lg:flex-row">
            <FeatureCard
              icon={Utensils}
              title={t('onboarding.welcome.foodTitle')}
              body={t('onboarding.welcome.foodBody')}
            />
            <FeatureCard
              icon={CalendarHeart}
              title={t('onboarding.welcome.cycleTitle')}
              body={t('onboarding.welcome.cycleBody')}
            />
            <FeatureCard
              icon={Smile}
              title={t('onboarding.welcome.moodTitle')}
              body={t('onboarding.welcome.moodBody')}
            />
          </View>
        </Section>

        {/* How it works */}
        <Section title={t('onboarding.welcome.stepsTitle')}>
          <View className="gap-3 lg:flex-row lg:gap-4">
            {[
              t('onboarding.welcome.step1'),
              t('onboarding.welcome.step2'),
              t('onboarding.welcome.step3'),
            ].map((step, i) => (
              <View
                key={step}
                className="bg-card/70 border-border flex-row items-center gap-4 rounded-2xl border p-4 lg:flex-1"
              >
                <View className="bg-secondary/50 h-9 w-9 items-center justify-center rounded-full">
                  <Text className="text-sm font-bold">{i + 1}</Text>
                </View>
                <Text className="flex-1 text-base leading-6">{step}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Privacy */}
        <View className="bg-primary gap-6 overflow-hidden rounded-3xl p-6 lg:flex-row lg:items-center lg:gap-12 lg:p-12">
          <View className="gap-3 lg:flex-1">
            <View className="bg-ivory/10 h-12 w-12 items-center justify-center rounded-2xl">
              <Icon as={ShieldCheck} size={24} className="text-ivory" />
            </View>
            <Text className="text-ivory text-2xl font-semibold tracking-tight lg:text-3xl">
              {t('onboarding.welcome.privacyTitle')}
            </Text>
            <Text className="text-ivory/80 text-base leading-6">
              {t('onboarding.welcome.privacyBody')}
            </Text>
          </View>
          <View className="gap-4 lg:flex-1">
            <PrivacyPoint icon={EyeOff} text={t('onboarding.welcome.privacyDiscreet')} />
            <PrivacyPoint icon={Lock} text={t('onboarding.welcome.privacyChoice')} />
            <PrivacyPoint icon={WifiOff} text={t('onboarding.welcome.privacyOffline')} />
          </View>
        </View>

        <View className="hidden items-center gap-4 lg:flex">
          <Text className="text-center text-3xl font-semibold tracking-tight">
            {t('onboarding.welcome.closingTitle')}
          </Text>
          <View className="flex-row items-center gap-3">
            <WelcomeActions onStart={next} inline />
          </View>
        </View>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          {t('auth.beta.note')}
        </Text>
      </View>
    );
  },
  Footer: function WelcomeFooter({ next }) {
    return <WelcomeActions onStart={next} />;
  },
};

function WelcomeActions({ onStart, inline = false }: { onStart: () => void; inline?: boolean }) {
  const { t } = useTranslation();
  const router = useAppRouter();
  return (
    <>
      <Button size="lg" onPress={onStart} className={cn(inline && 'px-8')}>
        <Text>{t('onboarding.welcome.start')}</Text>
      </Button>
      <Button variant="ghost" size="lg" onPress={() => router.push('/login')}>
        <Text>{t('onboarding.welcome.signIn')}</Text>
      </Button>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-5">
      <Text role="heading" aria-level={2} className="text-2xl font-semibold tracking-tight">
        {title}
      </Text>
      {children}
    </View>
  );
}

function FeatureCard({ icon, title, body }: { icon: IconComponent; title: string; body: string }) {
  return (
    <View className="bg-card border-border gap-3 rounded-3xl border p-6 shadow-sm shadow-black/5 lg:flex-1">
      <View className="bg-sage/15 h-12 w-12 items-center justify-center rounded-2xl">
        <Icon as={icon} size={24} className="text-primary" />
      </View>
      <Text className="text-lg font-semibold">{title}</Text>
      <Text className="text-muted-foreground text-base leading-6">{body}</Text>
    </View>
  );
}

function PrivacyPoint({ icon, text }: { icon: IconComponent; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="bg-ivory/10 h-9 w-9 items-center justify-center rounded-full">
        <Icon as={icon} size={18} className="text-ivory" />
      </View>
      <Text className="text-ivory flex-1 pt-1.5 text-base leading-6">{text}</Text>
    </View>
  );
}

/**
 * Decorative glimpse of the app (no real data, no numbers). Hidden from screen readers; the
 * feature cards below say the same thing in words.
 */
function AppPreview() {
  const { t } = useTranslation();
  const meals: [IconComponent, string][] = [
    [Soup, t('onboarding.welcome.previewDal')],
    [Wheat, t('onboarding.welcome.previewRice')],
    [Utensils, t('onboarding.welcome.previewBhaji')],
  ];
  return (
    <FadeIn delay={120}>
      <View aria-hidden className="items-center">
        <View className="bg-card border-border w-full max-w-[380px] gap-4 rounded-[32px] border p-5 shadow-xl shadow-black/10">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              {t('onboarding.welcome.previewToday')}
            </Text>
            <View className="bg-secondary/40 rounded-full px-2.5 py-1">
              <Text className="text-xs font-semibold">{t('onboarding.welcome.previewLogged')}</Text>
            </View>
          </View>
          <View className="gap-2.5">
            {meals.map(([icon, name]) => (
              <View
                key={name}
                className="bg-background flex-row items-center gap-3 rounded-2xl p-3"
              >
                <View className="bg-sage/15 h-10 w-10 items-center justify-center rounded-xl">
                  <Icon as={icon} size={20} className="text-primary" />
                </View>
                <Text className="flex-1 text-base font-medium">{name}</Text>
                <View className="bg-primary h-6 w-6 items-center justify-center rounded-full">
                  <Icon as={Check} size={13} strokeWidth={3} className="text-primary-foreground" />
                </View>
              </View>
            ))}
          </View>
          <View className="flex-row gap-2.5">
            <View className="bg-primary flex-1 gap-1 rounded-2xl p-4">
              <Icon as={CalendarHeart} size={20} className="text-taupe" />
              <Text className="text-ivory text-sm font-semibold">
                {t('onboarding.welcome.previewCycle')}
              </Text>
            </View>
            <View className="bg-secondary/40 flex-1 gap-1 rounded-2xl p-4">
              <Icon as={Smile} size={20} className="text-primary" />
              <Text className="text-sm font-semibold">{t('onboarding.welcome.previewMood')}</Text>
            </View>
          </View>
        </View>
      </View>
    </FadeIn>
  );
}
