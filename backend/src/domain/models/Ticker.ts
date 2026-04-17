/**
 * Represents the available financial asset categories in the trading platform.
 * Used for filtering the symbol list in the API response.
 */
export type TickerType = 'Forex' | 'Metals' | 'Shares' | 'Indices' | 'Commodities' | 'Crypto';

/**
 * Summary: Represents a market trading entity (e.g., stock, currency pair, or cryptocurrency).
 * Model Name: Ticker
 */
export interface Ticker {
  /** The unique identifier or trading symbol (e.g., 'EUR/USD', 'AAPL'). */
  symbol: string;
  /** The full name of the company or asset (e.g., 'Euro / US Dollar'). */
  name: string;
  /** The initial base price used for simulation initialization and baseline comparison. */
  basePrice: number;
  /** Category of the asset (e.g., 'Forex', 'Metals'). */
  type: TickerType;
  /** Whether the user has marked this asset as a favorite. */
  isFavorite: boolean;
  /** Whether the user currently holds this asset in their portfolio. */
  inPortfolio: boolean;
  /** URL or combined URLs (separated by '|') representing the asset's icon/flag. */
  icon: string;
}

/**
 * Summary: Represents a single point in time price update for a given ticker.
 * Model Name: PriceUpdate
 */
export interface PriceUpdate {
  /** The unique identifier or trading symbol associated with this update. */
  symbol: string;
  /** The new calculated price at the time of this update. */
  price: number;
  /** The UNIX timestamp (in milliseconds) representing when the update occurred. */
  timestamp: number;
}