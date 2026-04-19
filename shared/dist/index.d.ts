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

export declare const isTickerType: (value: unknown) => value is TickerType;
export declare const isTicker: (value: unknown) => value is Ticker;
export declare const isTickerWithPrice: (value: unknown) => value is TickerWithPrice;
export declare const isPriceUpdate: (value: unknown) => value is PriceUpdate;
