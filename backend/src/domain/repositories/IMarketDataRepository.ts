import { PriceUpdate } from '../models/Ticker';

/**
 * Persists the latest ticker prices, historical snapshots, and broadcast events.
 */
export interface IMarketDataRepository {
  /**
   * Lets bootstrap logic skip reseeding when a store already has market state.
   */
  hasPrices(): Promise<boolean>;

  /**
   * Stores the most recent price so reads do not need to scan historical entries.
   */
  setPrice(symbol: string, price: number): Promise<void>;

  /**
   * Returns the current price snapshot used by REST and websocket consumers.
   */
  getAllPrices(): Promise<Record<string, number>>;

  /**
   * Appends new price points to the rolling history kept for charting and replay.
   */
  saveHistory(symbol: string, history: PriceUpdate[]): Promise<void>;

  /**
   * Returns price history in chronological order for filtering at the service layer.
   */
  getHistory(symbol: string): Promise<PriceUpdate[]>;

  /**
   * Publishes a live price tick so connected clients and alert processors stay in sync.
   */
  publishPriceUpdate(update: PriceUpdate): Promise<void>;
}
