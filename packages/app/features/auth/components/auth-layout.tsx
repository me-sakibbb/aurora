'use client';

import { useTranslation } from '@mybela/i18n';
import { Text } from '@mybela/ui';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { BrandMark } from '../../../components/brand-mark';
import { LanguageToggle } from '../../../components/language-toggle';
import { useInsets } from '../../../lib/insets';

/**
 * Shell for every signed-out screen: one calm column (brand on top, form below), scrollable above
 * the keyboard. The same on every screen size (the app is phone-width everywhere).
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const insets = useInsets();

  return (
    <View className="bg-background flex-1">
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
          <View className="flex-row justify-end px-3 pt-2">
            <LanguageToggle />
          </View>
          <View className="flex-1 items-center justify-center px-5 pb-12 pt-2">
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
    <View className="items-center gap-3">
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

/** Screen title + supporting line, used at the top of each auth form. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-2">
      <Text
        role="heading"
        aria-level={1}
        className="text-center text-2xl font-semibold tracking-tight"
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-muted-foreground text-center text-base leading-6">{subtitle}</Text>
      ) : null}
    </View>
  );
}
