import {
  Carrot,
  ChefHat,
  CookingPot,
  Droplets,
  Drumstick,
  Flame,
  type IconComponent,
  LeafyGreen,
  Soup,
  UtensilsCrossed,
  Wheat,
} from '@aurora/ui';

/** The backend's recipe `cooking_method` values (recipes table check constraint). */
export const COOKING_METHODS = [
  'bhat',
  'dal',
  'bhorta',
  'bhaji',
  'torkari',
  'curry',
  'bhuna',
  'jhol',
  'polao_biryani',
  'other',
] as const;

export type CookingMethod = (typeof COOKING_METHODS)[number];

export const isCookingMethod = (value: unknown): value is CookingMethod =>
  (COOKING_METHODS as readonly unknown[]).includes(value);

// Display only: a picture per cooking method until foods have photos.
const METHOD_ICONS: Record<CookingMethod, IconComponent> = {
  bhat: Wheat,
  dal: Soup,
  bhorta: LeafyGreen,
  bhaji: Flame,
  torkari: Carrot,
  curry: Drumstick,
  bhuna: CookingPot,
  jhol: Droplets,
  polao_biryani: ChefHat,
  other: UtensilsCrossed,
};

export const methodIcon = (method: string | null | undefined): IconComponent =>
  isCookingMethod(method) ? METHOD_ICONS[method] : UtensilsCrossed;
