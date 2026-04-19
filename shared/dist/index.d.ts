export declare const TICKER_TYPES: readonly [
  "Forex",
  "Metals",
  "Shares",
  "Indices",
  "Commodities",
  "Crypto"
];

export type TickerType = typeof TICKER_TYPES[number];

export interface Ticker {
  symbol: string;
  name: string;
  basePrice: number;
  type: TickerType;
  isFavorite: boolean;
  inPortfolio: boolean;
  icon: string;
}

export interface TickerWithPrice extends Ticker {
  currentPrice: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export type AuthRole = "demo" | "trader" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export type AlertDirection = "above" | "below";

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: number;
  direction: AlertDirection;
  createdAt: number;
  triggeredAt?: number;
}

export interface AlertTriggerEvent {
  userId: string;
  price: number;
  timestamp: number;
  alert: PriceAlert;
}

export declare const isTickerType: (value: unknown) => value is TickerType;
export declare const isTicker: (value: unknown) => value is Ticker;
export declare const isTickerWithPrice: (value: unknown) => value is TickerWithPrice;
export declare const isPriceUpdate: (value: unknown) => value is PriceUpdate;
export declare const isAuthUser: (value: unknown) => value is AuthUser;
export declare const isAuthSession: (value: unknown) => value is AuthSession;
export declare const isPriceAlert: (value: unknown) => value is PriceAlert;
export declare const isAlertTriggerEvent: (value: unknown) => value is AlertTriggerEvent;
