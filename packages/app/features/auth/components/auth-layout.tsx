'use client';

import { useTranslation } from '@aurora/i18n';
import { cn, Text } from '@aurora/ui';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { BrandMark } from '../../../components/brand-mark';
import { LanguageToggle } from '../../../components/language-toggle';
import { useInsets } from '../../../lib/insets';

/**
 * Shell for every signed-out screen.
 * - Phones: one calm column (brand on top, form below), scrollable above the keyboard.
 * - Wide web (lg+): brand story on the left, form on the right.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const insets = useInsets();

  return (
    <View className="bg-background flex-1 lg:flex-row">
      <BrandPanel />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow"
          contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="flex-row justify-end px-3 pt-2 sm:px-6 sm:pt-4">
            <LanguageToggle />
          </View>
          <View className="flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8">
            <View className="w-full max-w-[400px] gap-8">
              <CompactBrand />
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Phone / narrow header: mark, name and the beta badge. Hidden when the side panel shows. */
function CompactBrand() {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-3 lg:hidden">
      <BrandMark size="lg" />
      <Text className="text-2xl font-semibold tracking-tight">{t('common.appName')}</Text>
      {/* <BetaBadge /> */}
    </View>
  );
}

// export function BetaBadge({ inverted = false }: { inverted?: boolean }) {
//   const { t } = useTranslation();
//   return (
//     <View
//       className={cn(
//         'flex-row items-center gap-1.5 self-center rounded-full px-3 py-1',
//         inverted ? 'bg-ivory/10 self-start' : 'bg-secondary/40',
//       )}
//     >
//       <View className={cn('h-1.5 w-1.5 rounded-full', inverted ? 'bg-taupe' : 'bg-sage')} />
//       <Text
//         className={cn('text-xs font-medium', inverted ? 'text-ivory' : 'text-secondary-foreground')}
//       >
//         {t('auth.beta.badge')}
//       </Text>
//     </View>
//   );
// }

/** Wide-screen brand story. Soft "aurora" glows are decorative only. */
function BrandPanel() {
  const { t } = useTranslation();
  const features = [
    t('auth.brand.featureFood'),
    t('auth.brand.featureCycle'),
    t('auth.brand.featureMood'),
  ];
  const glow = Platform.select({ web: 'blur-3xl' });

  return (
    <View className="bg-primary relative hidden w-[44%] max-w-[640px] justify-between overflow-hidden p-12 lg:flex">
      <View
        aria-hidden
        className={cn('bg-sage/40 absolute -right-24 -top-24 h-96 w-96 rounded-full', glow)}
      />
      <View
        aria-hidden
        className={cn(
          'bg-taupe/25 absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full',
          glow,
        )}
      />

      <View className="flex-row items-center gap-3">
        <BrandMark inverted />
        <Text className="text-ivory text-xl font-semibold tracking-tight">
          {t('common.appName')}
        </Text>
      </View>

      <View className="max-w-md gap-6">
        {/* <BetaBadge inverted /> */}
        <Text className="text-ivory text-4xl font-semibold leading-tight tracking-tight">
          {t('auth.brand.headline')}
        </Text>
        <Text className="text-ivory/80 text-lg leading-7">{t('auth.brand.body')}</Text>
        <View className="gap-3 pt-2">
          {features.map((feature) => (
            <View key={feature} className="flex-row items-center gap-3">
              <View className="bg-taupe h-2 w-2 rounded-full" />
              <Text className="text-ivory/90 text-base">{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text className="text-ivory/60 text-sm">{t('auth.beta.note')}</Text>
    </View>
  );
}

/** Screen title + supporting line, used at the top of each auth form. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-2">
      <Text
        role="heading"
        aria-level={1}
        className="text-center text-2xl font-semibold tracking-tight lg:text-left lg:text-3xl"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-muted-foreground text-center text-base leading-6 lg:text-left">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
