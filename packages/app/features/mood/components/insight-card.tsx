'use client';

import type { MoodInsight } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { cn, Icon, Lightbulb, Sparkles, Text } from '@mybela/ui';
import { View } from 'react-native';
import { PreviewBadge } from '../../home/components/primitives';

/**
 * F17: one plain-language observation about mood over time, written by the backend and shown
 * exactly as written, never as a chart or score. While there isn't enough to go on, the backend's
 * honest "not yet" wording is shown instead.
 */
export function MoodInsightCard({
  insight,
  demo = false,
  className,
}: {
  insight: MoodInsight;
  /** Sample content until the endpoint exists. */
  demo?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const ready = insight.status === 'ready' && Boolean(insight.observation);
  const text = ready ? insight.observation : insight.message;
  if (!text) return null;

  return (
    <View
      className={cn(
        'border-sage/30 bg-sage/10 gap-3 rounded-3xl border p-5',
        !ready && 'border-dashed',
        className,
      )}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className={cn(
            'h-9 w-9 items-center justify-center rounded-xl',
            ready ? 'bg-primary' : 'bg-card',
          )}
        >
          <Icon
            as={ready ? Lightbulb : Sparkles}
            size={18}
            className={ready ? 'text-primary-foreground' : 'text-muted-foreground'}
          />
        </View>
        <Text className="text-muted-foreground flex-1 text-xs font-semibold uppercase tracking-wider">
          {t(ready ? 'mood.insight.title' : 'mood.insight.notYetTitle')}
        </Text>
        {demo ? <PreviewBadge /> : null}
      </View>
      <Text
        className={cn(
          'leading-7',
          ready ? 'text-[17px] font-medium' : 'text-muted-foreground text-base',
        )}
      >
        {text}
      </Text>
    </View>
  );
}
