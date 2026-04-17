/**
 * Represents the available financial asset categories in the trading platform.
 * Used for filtering the symbol list in the UI.
 */
export type TickerType = 'Forex' | 'Metals' | 'Shares' | 'Indices' | 'Commodities' | 'Crypto';

/**
 * Represents a market trading entity (e.g., currency pair, stock, or cryptocurrency).
 * This model is used throughout the frontend to display symbol information.
 */
export interface Ticker {
  /** The unique identifier or trading symbol (e.g., 'EUR/USD', 'AAPL'). */
  symbol: string;
  /** The full name of the company or asset (e.g., 'Euro / US Dollar', 'Apple Inc.'). */
  name: string;
  /** The initial base price used to calculate percentage changes. */
  basePrice: number;
  /** The latest real-time price received via WebSocket. Optional before the first tick. */
  currentPrice?: number;
  /** The category of the asset (e.g., 'Forex', 'Shares'). */
  type: TickerType;
  /** Indicates if the user has marked this asset as a favorite (displays a star icon). */
  isFavorite: boolean;
  /** Indicates if the user currently holds positions in this asset (filters in 'Portfolio' tab). */
  inPortfolio: boolean;
  /** URL or combined URLs (separated by '|') for the asset's visual logo/flag. */
  icon: string;
}

/**
 * Represents a single real-time price update received from the WebSocket feed.
 */
export interface PriceUpdate {
  /** The unique identifier of the ticker being updated. */
  symbol: string;
  /** The newly calculated market price. */
  price: number;
  /** The UNIX timestamp (in milliseconds) representing when the update occurred. */
  timestamp: number;
}