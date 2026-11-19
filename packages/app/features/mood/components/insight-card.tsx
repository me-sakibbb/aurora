'use client';

import type { MoodInsight } from '@mybela/api';
import { useTranslation } from '@mybela/i18n';
import { cn, Icon, Lightbulb, Sparkles, Text } from '@mybela/ui';
import { View } from 'react-native';
import { Skeleton } from '../../../components/skeleton';
import { InlineState } from '../../home/components/primitives';
import type { SectionState } from '../../home/queries';

/**
 * F17: the backend's plain-language observation about mood over time, shown exactly as written,
 * never as a chart or score. With no check-ins in the range it's the backend's "not enough yet"
 * wording, drawn quieter. Loading, offline and error states for the card (F15).
 */
export function MoodInsightCard({
  insight,
  state,
  onRetry,
  className,
}: {
  insight: MoodInsight | null | undefined;
  state: SectionState;
  onRetry: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (state === 'loading') return <Skeleton className={cn('h-36 rounded-3xl', className)} />;
  if (state !== 'ready') {
    return <InlineState kind={state === 'offline' ? 'offline' : 'error'} onRetry={onRetry} />;
  }
  // The backend sent no sentence: nothing to show.
  if (!insight) return null;
  const ready = insight.status === 'ready';
  const text = insight.text;

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
