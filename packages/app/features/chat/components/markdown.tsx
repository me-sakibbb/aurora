'use client';

import { type InlineSpan, type MarkdownBlock, parseMarkdown } from '@mybela/api';
import { cn, Text } from '@mybela/ui';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { FadeIn } from '../../../components/fade-in';

/**
 * Body text sizes. Bengali script has taller glyphs and stacked conjuncts, so it gets a larger size
 * and looser lines than English (F16: adjust font and spacing to the reply's language).
 */
export const BODY_TEXT = {
  en: 'text-[15.5px] leading-[24px]',
  bn: 'text-[17px] leading-[30px]',
} as const;

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.bold || span.italic || span.code ? (
          <Text
            key={i}
            className={cn(
              span.bold && 'font-semibold',
              span.italic && 'italic',
              span.code && 'bg-muted rounded px-1 font-medium',
            )}
          >
            {span.text}
          </Text>
        ) : (
          span.text
        ),
      )}
    </>
  );
}

/**
 * A chat reply's light Markdown laid out natively. `reveal` fades the blocks in one after another,
 * so a reply that arrives all at once still feels like it's being told.
 */
export const Markdown = memo(function Markdown({
  source,
  bengali,
  reveal = false,
}: {
  source: string;
  bengali: boolean;
  reveal?: boolean;
}) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  const body = bengali ? BODY_TEXT.bn : BODY_TEXT.en;
  // Spread the reveal over at most ~1.2 s, however long the reply is.
  const step = blocks.length > 1 ? Math.min(140, 1200 / blocks.length) : 0;

  return (
    <View className="gap-3">
      {blocks.map((block, index) => {
        const content = <Block block={block} body={body} />;
        return reveal ? (
          <FadeIn key={index} delay={Math.round(index * step)}>
            {content}
          </FadeIn>
        ) : (
          <View key={index}>{content}</View>
        );
      })}
    </View>
  );
});

function Block({ block, body }: { block: MarkdownBlock; body: string }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text
          role="heading"
          aria-level={3}
          selectable
          className={cn(
            'font-bold tracking-tight',
            block.level === 1 ? 'text-lg leading-7' : 'text-base leading-6',
          )}
        >
          <Spans spans={block.spans} />
        </Text>
      );
    case 'rule':
      return <View className="bg-border my-1 h-px" />;
    case 'list':
      return (
        <View className="gap-2" role="list">
          {block.items.map((item, i) => (
            <View key={i} className="flex-row gap-2.5" role="listitem">
              {block.ordered ? (
                <Text className={cn(body, 'text-muted-foreground min-w-[18px] font-semibold')}>
                  {block.start + i}.
                </Text>
              ) : (
                <View className={cn('justify-center', bodyLineBox(body))}>
                  <View className="bg-accent h-1.5 w-1.5 rounded-full" />
                </View>
              )}
              <Text selectable className={cn(body, 'flex-1')}>
                <Spans spans={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    default:
      return (
        <Text selectable className={body}>
          <Spans spans={block.spans} />
        </Text>
      );
  }
}

/** A box one text line tall, so a bullet dot sits centred on the first line. */
function bodyLineBox(body: string) {
  return body === BODY_TEXT.bn ? 'h-[30px]' : 'h-[24px]';
}
