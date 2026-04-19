import { IMarketDataRepository } from '../../domain/repositories/IMarketDataRepository';
import { isPriceUpdate, PriceUpdate } from '../../domain/models/Ticker';
import { type createClient } from 'redis';
import { MAX_HISTORY_POINTS } from '../../config/history';

type RedisClientType = ReturnType<typeof createClient>;

export class RedisMarketDataRepository implements IMarketDataRepository {
  private readonly redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  async hasPrices(): Promise<boolean> {
    const exists = await this.redisClient.exists('prices');
    return exists > 0;
  }

  async setPrice(symbol: string, price: number): Promise<void> {
    await this.redisClient.hSet('prices', symbol, price.toString());
  }

  async getAllPrices(): Promise<Record<string, number>> {
    const prices = await this.redisClient.hGetAll('prices');
    const result: Record<string, number> = {};
    for (const [symbol, priceStr] of Object.entries(prices)) {
      result[symbol] = parseFloat(priceStr);
    }
    return result;
  }

  async saveHistory(symbol: string, history: PriceUpdate[]): Promise<void> {
    if (history.length === 0) return;
    const historyStrings = history.map((h) => JSON.stringify(h));
    await this.redisClient.rPush(`history:${symbol}`, historyStrings);
    await this.redisClient.lTrim(`history:${symbol}`, -MAX_HISTORY_POINTS, -1);
  }

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

  async publishPriceUpdate(update: PriceUpdate): Promise<void> {
    await this.redisClient.publish('priceUpdate', JSON.stringify(update));
  }
}
