import { IMarketDataRepository } from '../../domain/repositories/IMarketDataRepository';
import { isPriceUpdate, PriceUpdate } from '../../domain/models/Ticker';
import { type createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

/**
 * Summary: Implementation of the market data repository using Redis for fast data storage and pub/sub.
 * Class Name: RedisMarketDataRepository
 */
export class RedisMarketDataRepository implements IMarketDataRepository {
  private readonly redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  /**
   * Summary: Checks if 'prices' hash table exists in Redis to determine if seed data is needed.
   * Implementation: RedisMarketDataRepository.hasPrices
   * @returns True if market prices have been initialized, otherwise false.
   */
  async hasPrices(): Promise<boolean> {
    const exists = await this.redisClient.exists('prices');
    return exists > 0;
  }

  /**
   * Summary: Stores a ticker's latest price in the Redis 'prices' hash.
   * Implementation: RedisMarketDataRepository.setPrice
   * @param symbol - Ticker symbol (e.g., 'BTC-USD').
   * @param price - The numeric price to set.
   * @returns Void promise.
   */
  async setPrice(symbol: string, price: number): Promise<void> {
    await this.redisClient.hSet('prices', symbol, price.toString());
  }

  /**
   * Summary: Retrieves all stored ticker prices from the Redis 'prices' hash.
   * Implementation: RedisMarketDataRepository.getAllPrices
   * @returns A promise resolving to a dictionary mapping symbols to numeric prices.
   */
  async getAllPrices(): Promise<Record<string, number>> {
    const prices = await this.redisClient.hGetAll('prices');
    const result: Record<string, number> = {};
    for (const [symbol, priceStr] of Object.entries(prices)) {
      result[symbol] = parseFloat(priceStr);
    }
    return result;
  }

  /**
   * Summary: Appends new historical points to a Redis list and trims the list to keep only the latest 600 records.
   * Implementation: RedisMarketDataRepository.saveHistory
   * @param symbol - The ticker symbol associated with the history.
   * @param history - Formatted array of recent price updates.
   * @returns Void promise.
   */
  async saveHistory(symbol: string, history: PriceUpdate[]): Promise<void> {
    if (history.length === 0) return;
    const historyStrings = history.map((h) => JSON.stringify(h));
    await this.redisClient.rPush(`history:${symbol}`, historyStrings);
    await this.redisClient.lTrim(`history:${symbol}`, -600, -1);
  }

  /**
   * Summary: Fetches the entire history list for a ticker from Redis and deserializes it.
   * Implementation: RedisMarketDataRepository.getHistory
   * @param symbol - The target ticker symbol.
   * @returns Promise returning parsed `PriceUpdate` array.
   */
  async getHistory(symbol: string): Promise<PriceUpdate[]> {
    const historyStrings = await this.redisClient.lRange(
      `history:${symbol}`,
      0,
      -1,
    );
    return historyStrings.reduce<PriceUpdate[]>((history, entry) => {
      try {
        const parsed: unknown = JSON.parse(entry);
        if (isPriceUpdate(parsed)) {
          history.push(parsed);
        }
      } catch (error) {
        console.error(`Invalid history entry for ${symbol}:`, error);
      }

      return history;
    }, []);
  }

  /**
   * Summary: Publishes a real-time price update snapshot via Redis Pub/Sub channels.
   * Implementation: RedisMarketDataRepository.publishPriceUpdate
   * @param update - Single frame `PriceUpdate` data payload.
   * @returns Void promise.
   */
  async publishPriceUpdate(update: PriceUpdate): Promise<void> {
    await this.redisClient.publish('priceUpdate', JSON.stringify(update));
  }
}
