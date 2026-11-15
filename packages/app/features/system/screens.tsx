'use client';

import { useTranslation } from '@mybela/i18n';
import {
  Button,
  House,
  Icon,
  type IconComponent,
  RefreshCw,
  SearchX,
  Text,
  TriangleAlert,
} from '@mybela/ui';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { Pop } from '../../components/pop';
import { useInsets } from '../../lib/insets';
import { useAppRouter } from '../../lib/navigation';

/** A calm, centred full-screen message with up to two actions (F15). */
function SystemMessage({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: IconComponent;
  title: string;
  body: string;
  primary: { label: string; icon: IconComponent; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  const insets = useInsets();
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="flex-grow justify-center px-6"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="mx-auto w-full max-w-sm items-center gap-6">
        <Pop appear>
          <View className="bg-secondary/40 h-20 w-20 items-center justify-center rounded-[28px]">
            <Icon as={icon} size={34} strokeWidth={1.75} className="text-olive" />
          </View>
        </Pop>
        <FadeIn delay={100} className="items-center gap-2">
          <Text role="heading" aria-level={1} className="text-center text-2xl font-bold">
            {title}
          </Text>
          <Text className="text-muted-foreground text-center leading-6">{body}</Text>
        </FadeIn>
        <FadeIn delay={180} className="w-full gap-2">
          <Button size="lg" className="rounded-full" onPress={primary.onPress}>
            <Icon as={primary.icon} size={18} className="text-primary-foreground" />
            <Text>{primary.label}</Text>
          </Button>
          {secondary ? (
            <Button variant="ghost" className="rounded-full" onPress={secondary.onPress}>
              <Text>{secondary.label}</Text>
            </Button>
          ) : null}
        </FadeIn>
      </View>
    </ScrollView>
  );
}

/** An address that doesn't exist (web 404, an old deep link on Android). */
export function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useAppRouter();
  return (
    <SystemMessage
      icon={SearchX}
      title={t('system.notFound.title')}
      body={t('system.notFound.body')}
      primary={{ label: t('system.home'), icon: House, onPress: () => router.replace('/') }}
    />
  );
}

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const router = useAppRouter();
  return (
    <SystemMessage
      icon={TriangleAlert}
      title={t('system.crash.title')}
      body={t('system.crash.body')}
      primary={{ label: t('common.retry'), icon: RefreshCw, onPress: onRetry }}
      secondary={{
        label: t('system.home'),
        onPress: () => router.replace('/'),
      }}
    />
  );
}

/**
 * Catches a screen that fails to render, so one bad answer from the backend shows a friendly
 * "try again" instead of a blank app (F15). Saved data lives in the query cache and the offline
 * write queue, outside this boundary, so nothing is lost. A new `resetKey` (the route) clears the
 * error, so navigating away from a broken screen works.
 */
export class ScreenErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Shows up in Clarity's session (console) and in dev tools; no custom tracking (F14).
    console.error('Screen crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) return <CrashScreen onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
