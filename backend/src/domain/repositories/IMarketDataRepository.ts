import { PriceUpdate } from '../models/Ticker';

/**
 * Summary: Interface defining the contract for market data storage and retrieval.
 * Interface Name: IMarketDataRepository
 */
export interface IMarketDataRepository {
  /**
   * Summary: Checks if there are any initialized prices in the repository.
   * Method: IMarketDataRepository.hasPrices
   * @returns A boolean promise indicating whether prices exist.
   */
  hasPrices(): Promise<boolean>;

  /**
   * Summary: Saves the current price for a specific ticker symbol.
   * Method: IMarketDataRepository.setPrice
   * @param symbol - The ticker symbol (e.g. 'AAPL').
   * @param price - The current price to store.
   * @returns Void promise upon completion.
   */
  setPrice(symbol: string, price: number): Promise<void>;

  /**
   * Summary: Retrieves all current prices from the repository.
   * Method: IMarketDataRepository.getAllPrices
   * @returns A promise yielding a key-value record of ticker symbols to prices.
   */
  getAllPrices(): Promise<Record<string, number>>;

  /**
   * Summary: Appends a batch of historical price updates for a specific ticker.
   * Method: IMarketDataRepository.saveHistory
   * @param symbol - The ticker symbol (e.g. 'AAPL').
   * @param history - Array of price updates to add.
   * @returns Void promise upon completion.
   */
  saveHistory(symbol: string, history: PriceUpdate[]): Promise<void>;

  /**
   * Summary: Retrieves the historical price points for a given ticker.
   * Method: IMarketDataRepository.getHistory
   * @param symbol - The ticker symbol.
   * @returns A promise yielding an array of chronological price updates.
   */
  getHistory(symbol: string): Promise<PriceUpdate[]>;

  /**
   * Summary: Publishes a single real-time price update to subscribers.
   * Method: IMarketDataRepository.publishPriceUpdate
   * @param update - The real-time price update to broadcast.
   * @returns Void promise upon completion.
   */
  publishPriceUpdate(update: PriceUpdate): Promise<void>;
}
