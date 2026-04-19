import { TICKER_TYPES } from '@trading-dashboard/shared';
import type { TickerType } from '@trading-dashboard/shared';

export {
  TICKER_TYPES,
  isPriceUpdate,
  isTicker,
  isTickerType,
  isTickerWithPrice,
} from '@trading-dashboard/shared';

export type {
  PriceUpdate,
  Ticker,
  TickerType,
  TickerWithPrice,
} from '@trading-dashboard/shared';

export type DashboardTab = 'Favorites' | 'Portfolio' | 'All' | TickerType;

export const DASHBOARD_TABS: readonly DashboardTab[] = [
  'Favorites',
  'Portfolio',
  'All',
  ...TICKER_TYPES,
];

export const isDashboardTab = (value: unknown): value is DashboardTab =>
  typeof value === 'string' && DASHBOARD_TABS.includes(value as DashboardTab);
