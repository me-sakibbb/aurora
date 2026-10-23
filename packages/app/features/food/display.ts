import type { FoodItem } from '@aurora/api';
import type { Language, useTranslation } from '@aurora/i18n';
import { isCookingMethod } from './method-icons';

type TFunction = ReturnType<typeof useTranslation>['t'];

/**
 * Both names, so every result reads in Bengali and English (F5): the UI language first, the
 * other underneath. Falls back to the English name when there's no Bengali one.
 */
export function foodNames(item: Pick<FoodItem, 'name' | 'name_bn'>, language: Language) {
  if (!item.name_bn) return { primary: item.name, secondary: null };
  return language === 'bn'
    ? { primary: item.name_bn, secondary: item.name }
    : { primary: item.name, secondary: item.name_bn };
}

export function methodLabel(t: TFunction, method: string | null | undefined) {
  return t(`food.methods.${isCookingMethod(method) ? method : 'other'}`);
}

/**
 * The calorie figure exactly as the backend gives it: a range when it sends one, otherwise its
 * per-100 g value. `null` when it has neither.
 */
export function kcalLabel(t: TFunction, item: Pick<FoodItem, 'kcal_range' | 'kcal_per_100g'>) {
  if (item.kcal_range) {
    return t('home.kcalRange', {
      min: Math.round(item.kcal_range.min).toLocaleString(),
      max: Math.round(item.kcal_range.max).toLocaleString(),
    });
  }
  if (item.kcal_per_100g != null) {
    return t('food.kcalPer100g', { kcal: Math.round(item.kcal_per_100g).toLocaleString() });
  }
  return null;
}

export type TextPart = { text: string; match: boolean };

/**
 * Splits `text` around the first place a typed word appears (longest word first), so the row can
 * bold what matched. Case-insensitive; Bengali is matched as typed.
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  for (const word of words) {
    const at = lower.indexOf(word.toLowerCase());
    if (at === -1) continue;
    return [
      { text: text.slice(0, at), match: false },
      { text: text.slice(at, at + word.length), match: true },
      { text: text.slice(at + word.length), match: false },
    ].filter((part) => part.text.length > 0);
  }
  return [{ text, match: false }];
}
