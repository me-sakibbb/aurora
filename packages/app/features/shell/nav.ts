import {
  ChartNoAxesColumn,
  Flower2,
  House,
  type IconComponent,
  MessageCircleHeart,
  Utensils,
} from '@aurora/ui';
import { useCycleVisible } from '../home/queries';

export type NavKey = 'home' | 'food' | 'chat' | 'cycle' | 'insights';

export type NavItem = { key: NavKey; href: string; icon: IconComponent };

const ITEMS: Record<NavKey, NavItem> = {
  home: { key: 'home', href: '/', icon: House },
  food: { key: 'food', href: '/food', icon: Utensils },
  chat: { key: 'chat', href: '/chat', icon: MessageCircleHeart },
  cycle: { key: 'cycle', href: '/cycle', icon: Flower2 },
  insights: { key: 'insights', href: '/insights', icon: ChartNoAxesColumn },
};

/**
 * The app's top-level sections. Cycle only exists for accounts the backend marks as opted in
 * (F13); for everyone else that slot in the bottom bar shows Insights instead.
 */
export function useNavItems() {
  const cycle = useCycleVisible();
  return {
    /** Bottom bar: two either side of the central Log button. */
    bar: {
      left: [ITEMS.home, ITEMS.food],
      right: [ITEMS.chat, cycle ? ITEMS.cycle : ITEMS.insights],
    },
    /** Wide-screen sidebar: everything. */
    all: cycle
      ? [ITEMS.home, ITEMS.food, ITEMS.chat, ITEMS.cycle, ITEMS.insights]
      : [ITEMS.home, ITEMS.food, ITEMS.chat, ITEMS.insights],
  };
}

export function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
