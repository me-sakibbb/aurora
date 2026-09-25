'use client';

import { useTranslation } from '@aurora/i18n';
import { Button, Card, CardContent, CardHeader, CardTitle, Text } from '@aurora/ui';
import { Platform, View } from 'react-native';
import { useLanguage } from '../../lib/language';

// Placeholder screen proving the shared pipeline end to end: one component, NativeWind classes,
// shared tokens, i18n, rendered by Expo Router (native) and Next.js (web).
export function HomeScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <View className="bg-background flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t('home.title')}</CardTitle>
          <Text variant="muted">{t('home.subtitle')}</Text>
        </CardHeader>
        <CardContent className="gap-4">
          <Text variant="small">Platform: {Platform.OS}</Text>
          <Button onPress={() => setLanguage(language === 'en' ? 'bn' : 'en')}>
            <Text>{t('home.switchLanguage')}</Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  );
}
