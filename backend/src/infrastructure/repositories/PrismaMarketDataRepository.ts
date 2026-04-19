import { PriceUpdate } from '../../domain/models/Ticker';
import { IMarketDataRepository } from '../../domain/repositories/IMarketDataRepository';
import { PrismaClient } from '@prisma/client';
import { redisClient } from '../redis/redisClient';

const prisma = new PrismaClient();

export class PrismaMarketDataRepository implements IMarketDataRepository {
  async hasPrices(): Promise<boolean> {
    const count = await prisma.priceHistory.count();
    if (count > 0) return true;
    const exists = await redisClient.exists('prices');
    return exists > 0;
  }

  async setPrice(symbol: string, price: number): Promise<void> {
    // Keep hot-path caching in Redis
    await redisClient.hSet('prices', symbol, price.toString());
  }

  async getAllPrices(): Promise<Record<string, number>> {
    const prices = await redisClient.hGetAll('prices');
    return Object.fromEntries(
      Object.entries(prices).map(([symbol, price]) => [symbol, Number(price)]),
    );
  }

  async saveHistory(symbol: string, history: PriceUpdate[]): Promise<void> {
    // Store in PostgreSQL for cold storage
    await prisma.priceHistory.createMany({
      data: history.map((h) => ({
        symbol: h.symbol,
        price: h.price,
        timestamp: h.timestamp,
      })),
    });

    // Also keep rolling 600 in Redis for fast chart loads
    const historyStrings = history.map((update) => JSON.stringify(update));
    await redisClient.rPush(`history:${symbol}`, historyStrings);
    await redisClient.lTrim(`history:${symbol}`, -600, -1);
  }

  async getHistory(symbol: string): Promise<PriceUpdate[]> {
    // Primary read from Redis for fast load, fallback to Postgres
    const historyStrings = await redisClient.lRange(`history:${symbol}`, 0, -1);
    if (historyStrings.length > 0) {
      return historyStrings.map((str) => JSON.parse(str));
    }

    const rows = await prisma.priceHistory.findMany({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      take: 600,
    });
    return rows
      .reverse()
      .map((r: { symbol: string; price: number; timestamp: number }) => ({
        symbol: r.symbol,
        price: r.price,
        timestamp: r.timestamp,
      }));
  }

  async publishPriceUpdate(update: PriceUpdate): Promise<void> {
    await redisClient.publish('priceUpdate', JSON.stringify(update));
  }
}
