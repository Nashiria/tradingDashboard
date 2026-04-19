import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketDataService } from '../src/business/services/MarketDataService';
import { PriceUpdate } from '../src/domain/models/Ticker';
import { DEFAULT_TICKERS } from '../src/config/marketTickers';
import { IMarketDataRepository } from '../src/domain/repositories/IMarketDataRepository';

class InMemoryMarketDataRepository implements IMarketDataRepository {
  constructor(
    private readonly historyBySymbol: Record<string, PriceUpdate[]> = {},
    private readonly prices: Record<string, number> = {},
  ) {}

  async hasPrices(): Promise<boolean> {
    return Object.keys(this.prices).length > 0;
  }

  async setPrice(symbol: string, price: number): Promise<void> {
    this.prices[symbol] = price;
  }

  async getAllPrices(): Promise<Record<string, number>> {
    return this.prices;
  }

  async saveHistory(symbol: string, history: PriceUpdate[]): Promise<void> {
    this.historyBySymbol[symbol] = [
      ...(this.historyBySymbol[symbol] ?? []),
      ...history,
    ];
  }

  async getHistory(symbol: string): Promise<PriceUpdate[]> {
    return this.historyBySymbol[symbol] ?? [];
  }

  async publishPriceUpdate(): Promise<void> {}
}

test('MarketDataService filters and limits ticker history', async () => {
  const history: PriceUpdate[] = [
    { symbol: 'EUR/USD', price: 1.1, timestamp: 1000 },
    { symbol: 'EUR/USD', price: 1.2, timestamp: 2000 },
    { symbol: 'EUR/USD', price: 1.3, timestamp: 3000 },
    { symbol: 'EUR/USD', price: 1.4, timestamp: 4000 },
  ];
  const repository = new InMemoryMarketDataRepository({ 'EUR/USD': history });
  const service = new MarketDataService(repository, DEFAULT_TICKERS);

  const filtered = await service.getHistory('EUR/USD', {
    from: 1500,
    to: 3500,
    limit: 2,
  });

  assert.deepEqual(filtered, [
    { symbol: 'EUR/USD', price: 1.2, timestamp: 2000 },
    { symbol: 'EUR/USD', price: 1.3, timestamp: 3000 },
  ]);
});

test('MarketDataService reports known tickers from its catalog', () => {
  const service = new MarketDataService(
    new InMemoryMarketDataRepository(),
    DEFAULT_TICKERS,
  );

  assert.equal(service.hasTicker('EUR/USD'), true);
  assert.equal(service.hasTicker('UNKNOWN'), false);
});

test('MarketDataService uses the injected ticker catalog', async () => {
  const customTickers = [
    {
      symbol: 'CUSTOM',
      name: 'Custom Asset',
      basePrice: 42,
      type: 'Shares' as const,
      isFavorite: false,
      inPortfolio: false,
      icon: 'custom-icon',
    },
  ];
  const repository = new InMemoryMarketDataRepository({}, { CUSTOM: 45 });
  const service = new MarketDataService(repository, customTickers);

  const tickers = await service.getTickers();

  assert.deepEqual(tickers, [
    {
      ...customTickers[0],
      currentPrice: 45,
    },
  ]);
  assert.equal(service.hasTicker('EUR/USD'), false);
});

test('MarketDataService returns a single ticker with the latest price', async () => {
  const service = new MarketDataService(
    new InMemoryMarketDataRepository({}, { 'EUR/USD': 1.2345 }),
    DEFAULT_TICKERS,
  );

  const ticker = await service.getTicker('EUR/USD');

  assert.deepEqual(ticker, {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    basePrice: 1.085,
    currentPrice: 1.2345,
    type: 'Forex',
    isFavorite: true,
    inPortfolio: true,
    icon: 'https://flagcdn.com/w40/eu.png|https://flagcdn.com/w40/us.png',
  });
});

test('MarketDataService returns undefined for an unknown ticker lookup', async () => {
  const service = new MarketDataService(
    new InMemoryMarketDataRepository(),
    DEFAULT_TICKERS,
  );

  const ticker = await service.getTicker('UNKNOWN');

  assert.equal(ticker, undefined);
});
