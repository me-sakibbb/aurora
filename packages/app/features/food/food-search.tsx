'use client';

import type { FoodItem } from '@aurora/api';
import { useTranslation } from '@aurora/i18n';
import {
  Button,
  cn,
  Flag,
  Icon,
  type IconComponent,
  LayoutGrid,
  SearchX,
  Sparkles,
  Text,
  WifiOff,
} from '@aurora/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  type TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { FadeIn } from '../../components/fade-in';
import { FoodImage } from '../../components/food-image';
import { Skeleton } from '../../components/skeleton';
import { tapHaptic } from '../../lib/haptics';
import { useLanguage } from '../../lib/language';
import { useIsOnline } from '../../lib/use-online';
import { InlineState } from '../home/components/primitives';
import { FoodCard } from './components/food-card';
import { MissingFoodSheet } from './components/missing-food-sheet';
import { SearchField } from './components/search-field';
import { foodNames, methodLabel } from './display';
import { COOKING_METHODS, type CookingMethod, methodIcon } from './method-icons';
import { useFoodBrowse, useFoodSearch, useRecentFoods } from './queries';

/** Cards past this one appear without a stagger, so long lists don't feel slow. */
const STAGGER_CARDS = 8;

/** Cards per row by window width: 2 on phones, 3 on tablets and small laptops, 4 on wide screens. */
function useColumns() {
  const { width } = useWindowDimensions();
  if (width < 640) return 2;
  if (width < 1200) return 3;
  return 4;
}

/**
 * F5 Food Search, the one search experience reused across the app. Type in Bengali, English or
 * a mix; matches show instantly and the backend's arrive as you pause. With an empty box it shows
 * recently viewed foods, ideas to try and every food to browse by type. Every list scrolls
 * forever, a page at a time.
 *
 * Hosts decide what picking a food does (`onSelect`): the Food tab opens its details; logging
 * (F6) and onboarding can plug in the same way.
 */
export function FoodSearch({
  onSelect,
  autoFocus,
  header,
}: {
  onSelect: (item: FoodItem) => void;
  autoFocus?: boolean;
  /** Rendered above the search box (e.g. the screen title). */
  header?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const online = useIsOnline();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<CookingMethod | null>(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const search = useFoodSearch(query);
  const browse = useFoodBrowse(method);
  const idle = search.normalized.length === 0;
  const list = idle ? browse : search;
  const items = idle ? browse.items : search.results;
  const columns = useColumns();

  const select = useCallback(
    (item: FoodItem) => {
      tapHaptic();
      onSelect(item);
    },
    [onSelect],
  );

  const tryQuery = (text: string) => {
    tapHaptic();
    setQuery(text);
    inputRef.current?.focus();
  };

  let empty: React.ReactElement | null = null;
  if (idle) {
    if (browse.loading) {
      empty = <CardsSkeleton columns={columns} />;
    } else if (browse.failed) {
      empty = <InlineState kind={online ? 'error' : 'offline'} onRetry={browse.retry} />;
    }
  } else if (search.waiting) {
    empty = <CardsSkeleton columns={columns} rows={1} />;
  } else {
    empty = (
      <NoResults
        query={query.trim()}
        offline={!online}
        failed={search.serverFailed}
        onRetry={search.retryServer}
        onTry={tryQuery}
        onFlag={() => setMissingOpen(true)}
      />
    );
  }

  let footer: React.ReactElement | null = null;
  if (items.length > 0) {
    if (list.hasMore || list.loadingMore) {
      footer = <LoadingMore />;
    } else if (!idle) {
      footer = <FlagFooter onFlag={() => setMissingOpen(true)} />;
    } else {
      footer = <EndOfList />;
    }
  }

  return (
    <View className="flex-1">
      <View className="mx-auto w-full max-w-5xl gap-3 px-5 pb-3 lg:px-10">
        {header}
        <SearchField
          inputRef={inputRef}
          value={query}
          onChangeText={setQuery}
          onSubmit={() => {
            const first = search.results[0];
            if (first) select(first);
          }}
          busy={search.waiting}
          autoFocus={autoFocus}
        />
        {!online ? (
          <FadeIn className="bg-muted flex-row items-center gap-2.5 rounded-2xl px-4 py-2.5">
            <Icon as={WifiOff} size={16} className="text-muted-foreground" />
            <Text className="text-muted-foreground flex-1 text-sm" role="status">
              {t('food.search.offline')}
            </Text>
          </FadeIn>
        ) : null}
      </View>

      <FlatList
        // numColumns can't change on the fly; remount the grid when the column count does.
        key={`grid-${columns}`}
        numColumns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-5xl px-3.5 pb-10 lg:px-8"
        onEndReached={list.hasMore ? list.loadMore : undefined}
        onEndReachedThreshold={0.6}
        ListHeaderComponent={
          idle ? (
            <IdleHeader
              method={method}
              onMethod={setMethod}
              onTry={tryQuery}
              onPick={select}
              catalogue={browse.catalogue.data}
            />
          ) : (
            <ResultsHeader
              count={search.results.length}
              more={search.hasMore}
              hidden={search.results.length === 0}
              note={
                search.serverFailed && search.results.length > 0 ? t('food.search.partial') : null
              }
            />
          )
        }
        ListEmptyComponent={empty}
        renderItem={({ item, index }) => (
          // Fixed widths (not flex) so a short last row keeps the same card size.
          <View style={{ width: `${100 / columns}%` }} className="p-1.5">
            <FadeIn delay={Math.min(index % (columns * 5), STAGGER_CARDS) * 30} className="flex-1">
              <FoodCard item={item} query={query} onPress={select} />
            </FadeIn>
          </View>
        )}
        ListFooterComponent={footer}
      />

      <MissingFoodSheet open={missingOpen} query={query} onClose={() => setMissingOpen(false)} />
    </View>
  );
}

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between px-1.5">
      <Text role="heading" aria-level={2} className="text-[17px] font-bold tracking-tight">
        {children}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} className="active:opacity-60">
          <Text className="text-muted-foreground text-sm font-semibold">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-3 px-1.5"
    >
      {children}
    </ScrollView>
  );
}

function useExamples() {
  const { t } = useTranslation();
  return t('food.search.examples')
    .split(',')
    .map((example) => example.trim())
    .filter(Boolean);
}

/** "Try [ডাল] [bhorta] [cha]": a single line of tappable example-search badges. */
function TryLine({
  onTry,
  limit,
  center,
}: {
  onTry: (text: string) => void;
  limit?: number;
  center?: boolean;
}) {
  const { t } = useTranslation();
  const examples = useExamples().slice(0, limit);
  return (
    <View
      className={cn(
        'flex-row flex-wrap items-center gap-x-1.5 gap-y-1.5 px-1.5',
        center && 'justify-center',
      )}
    >
      <Icon as={Sparkles} size={15} className="text-muted-foreground mr-1" />
      <Text className="text-muted-foreground text-sm">{t('food.search.tryPrefix')}</Text>
      {examples.map((example) => (
        <Pressable
          key={example}
          onPress={() => onTry(example)}
          role="button"
          aria-label={t('food.search.tryLabel', { example })}
          hitSlop={4}
          className="bg-card border-border rounded-full border px-3 py-1 hover:bg-muted active:bg-muted"
        >
          <Text className="text-foreground text-xs font-semibold">{example}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A recently viewed food: a small photo (or icon) with its name underneath. */
function RecentTile({ item, onPress }: { item: FoodItem; onPress: () => void }) {
  const { language } = useLanguage();
  const name = foodNames(item, language).primary;
  return (
    <Pressable
      onPress={onPress}
      aria-label={name}
      className="w-[76px] items-center gap-1.5 active:opacity-80"
    >
      <View className="bg-sage/15 border-border h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-2xl border">
        <FoodImage
          uri={item.image_url}
          className="absolute inset-0"
          fallback={
            <Icon as={methodIcon(item.cooking_method)} size={26} className="text-primary/70" />
          }
        />
      </View>
      <Text numberOfLines={2} className="text-center text-xs font-medium leading-4">
        {name}
      </Text>
    </Pressable>
  );
}

/** A cooking type to browse: a round icon tile with its name underneath. */
function CategoryTile({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: IconComponent;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="radio"
      aria-checked={selected}
      aria-label={label}
      className="w-[68px] items-center gap-1.5 active:opacity-80"
    >
      <View
        className={cn(
          'h-14 w-14 items-center justify-center rounded-full border',
          selected ? 'bg-primary border-primary' : 'bg-card border-border',
        )}
      >
        <Icon
          as={icon}
          size={24}
          strokeWidth={1.75}
          className={selected ? 'text-primary-foreground' : 'text-primary'}
        />
      </View>
      <Text
        numberOfLines={2}
        className={cn(
          'text-center text-xs leading-4',
          selected ? 'text-foreground font-bold' : 'text-muted-foreground font-medium',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The empty box: recently viewed foods, ideas to try, then every food by cooking type. */
function IdleHeader({
  method,
  onMethod,
  onTry,
  onPick,
  catalogue,
}: {
  method: CookingMethod | null;
  onMethod: (method: CookingMethod | null) => void;
  onTry: (text: string) => void;
  onPick: (item: FoodItem) => void;
  catalogue: FoodItem[] | undefined;
}) {
  const { t } = useTranslation();
  const recent = useRecentFoods((s) => s.items);
  const clearRecent = useRecentFoods((s) => s.clear);

  // Prefer the catalogue's current copy of a recent food, in case its details changed.
  const byId = useMemo(
    () => new Map((catalogue ?? []).map((item) => [item.id, item])),
    [catalogue],
  );
  // Only types that have foods; every type until the catalogue is known.
  const methods = useMemo(
    () =>
      catalogue
        ? COOKING_METHODS.filter((m) => catalogue.some((item) => item.cooking_method === m))
        : COOKING_METHODS,
    [catalogue],
  );
  const pickMethod = (next: CookingMethod | null) => {
    tapHaptic();
    onMethod(next);
  };

  return (
    <View className="gap-7 pb-3 pt-1">
      <FadeIn>
        <TryLine onTry={onTry} />
      </FadeIn>

      {recent.length > 0 ? (
        <FadeIn delay={60}>
          <SectionTitle action={{ label: t('food.search.clearRecent'), onPress: clearRecent }}>
            {t('food.search.recent')}
          </SectionTitle>
          <Rail>
            {recent.map((saved) => {
              const item = byId.get(saved.id) ?? saved;
              return <RecentTile key={item.id} item={item} onPress={() => onPick(item)} />;
            })}
          </Rail>
        </FadeIn>
      ) : null}

      <FadeIn delay={120}>
        <SectionTitle>{t('food.search.browse')}</SectionTitle>
        <View role="radiogroup" aria-label={t('food.search.browse')}>
          <Rail>
            <CategoryTile
              label={t('food.search.all')}
              icon={LayoutGrid}
              selected={method === null}
              onPress={() => pickMethod(null)}
            />
            {methods.map((m) => (
              <CategoryTile
                key={m}
                icon={methodIcon(m)}
                label={methodLabel(t, m)}
                selected={method === m}
                onPress={() => pickMethod(method === m ? null : m)}
              />
            ))}
          </Rail>
        </View>
        <Text
          role="heading"
          aria-level={2}
          aria-live="polite"
          className="mt-6 px-1.5 text-[17px] font-bold tracking-tight"
        >
          {method ? methodLabel(t, method) : t('food.search.allDishes')}
        </Text>
      </FadeIn>
    </View>
  );
}

function ResultsHeader({
  count,
  more,
  hidden,
  note,
}: {
  count: number;
  more: boolean;
  hidden: boolean;
  note: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-1 px-1.5 pb-1 pt-1">
      {/* Kept mounted so screen readers hear the count change. */}
      <Text
        aria-live="polite"
        className={cn('text-muted-foreground text-sm', hidden && 'opacity-0')}
      >
        {more ? t('food.search.resultsMore', { count }) : t('food.search.results', { count })}
      </Text>
      {note ? <Text className="text-muted-foreground text-xs">{note}</Text> : null}
    </View>
  );
}

function NoResults({
  query,
  offline,
  failed,
  onRetry,
  onTry,
  onFlag,
}: {
  query: string;
  offline: boolean;
  failed: boolean;
  onRetry: () => void;
  onTry: (text: string) => void;
  onFlag: () => void;
}) {
  const { t } = useTranslation();

  return (
    <FadeIn className="items-center gap-4 px-6 py-10">
      <View className="bg-muted h-20 w-20 items-center justify-center rounded-[28px]">
        <Icon as={SearchX} size={34} strokeWidth={1.75} className="text-muted-foreground" />
      </View>
      <View className="items-center gap-1.5">
        <Text role="heading" aria-level={2} className="text-center text-lg font-bold">
          {t('food.empty.title', { query })}
        </Text>
        <Text className="text-muted-foreground max-w-sm text-center leading-6">
          {offline
            ? t('food.empty.offline')
            : failed
              ? t('food.empty.failed')
              : t('food.empty.body')}
        </Text>
      </View>

      {failed && !offline ? (
        <Button variant="outline" size="sm" className="rounded-full" onPress={onRetry}>
          <Text>{t('common.retry')}</Text>
        </Button>
      ) : null}

      <TryLine onTry={onTry} limit={4} center />

      <View className="bg-card border-border mt-2 w-full max-w-sm items-center gap-3 rounded-3xl border border-dashed p-5">
        <Text className="text-center font-semibold">{t('food.empty.flagTitle')}</Text>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          {t('food.empty.flagBody')}
        </Text>
        <Button className="rounded-full" onPress={onFlag}>
          <Icon as={Flag} size={16} className="text-primary-foreground" />
          <Text>{t('food.empty.flag')}</Text>
        </Button>
      </View>
    </FadeIn>
  );
}

function FlagFooter({ onFlag }: { onFlag: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onFlag}
      className="active:bg-muted hover:bg-muted/60 mt-3 flex-row items-center justify-center gap-2 rounded-2xl py-4"
    >
      <Icon as={Flag} size={15} className="text-muted-foreground" />
      <Text className="text-muted-foreground text-sm">
        {t('food.search.notListed')}{' '}
        <Text className="text-foreground text-sm font-semibold underline">
          {t('food.empty.flag')}
        </Text>
      </Text>
    </Pressable>
  );
}

function LoadingMore() {
  const { t } = useTranslation();
  return (
    <View
      aria-busy
      aria-label={t('food.search.loadingMore')}
      className="items-center justify-center py-6"
    >
      <ActivityIndicator className="text-muted-foreground" />
    </View>
  );
}

function EndOfList() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 px-6 py-6" aria-hidden>
      <View className="bg-border h-px flex-1" />
      <Text className="text-muted-foreground text-xs">{t('food.search.end')}</Text>
      <View className="bg-border h-px flex-1" />
    </View>
  );
}

function CardsSkeleton({ columns, rows = 2 }: { columns: number; rows?: number }) {
  const { t } = useTranslation();
  return (
    <View aria-busy aria-label={t('common.loading')} className="flex-row flex-wrap pt-2">
      {Array.from({ length: columns * rows }, (_, i) => (
        <View key={i} style={{ width: `${100 / columns}%` }} className="p-1.5">
          <View className="bg-card border-border overflow-hidden rounded-3xl border">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <View className="gap-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-1 h-2.5 w-1/3" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
