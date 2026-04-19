import test from 'node:test';
import assert from 'node:assert/strict';
import { TickerController } from '../src/api/controllers/TickerController';
import { MarketDataService } from '../src/business/services/MarketDataService';
import { DEFAULT_TICKERS } from '../src/config/marketTickers';
import { createApplicationContext } from '../src/di';
import { TOKENS } from '../src/di/tokens';
import { PriceUpdate } from '../src/domain/models/Ticker';
import { IMarketDataRepository } from '../src/domain/repositories/IMarketDataRepository';

class InMemoryMarketDataRepository implements IMarketDataRepository {
  async hasPrices(): Promise<boolean> {
    return false;
  }

  async setPrice(): Promise<void> {}

  async getAllPrices(): Promise<Record<string, number>> {
    return {};
  }

  async saveHistory(_symbol: string, _history: PriceUpdate[]): Promise<void> {}

  async getHistory(): Promise<PriceUpdate[]> {
    return [];
  }

  async publishPriceUpdate(): Promise<void> {}
}

test('createApplicationContext resolves a single instance per token', () => {
  const context = createApplicationContext();

  assert.strictEqual(
    context.tickerCatalog,
    context.container.resolve(TOKENS.tickerCatalog),
  );
  assert.strictEqual(
    context.marketDataRepository,
    context.container.resolve(TOKENS.marketDataRepository),
  );
  assert.strictEqual(
    context.marketDataService,
    context.container.resolve(TOKENS.marketDataService),
  );
  assert.strictEqual(
    context.tickerController,
    context.container.resolve(TOKENS.tickerController),
  );
});

test('createApplicationContext honors dependency overrides', () => {
  const tickerCatalog = DEFAULT_TICKERS.slice(0, 1);
  const marketDataRepository = new InMemoryMarketDataRepository();
  const marketDataService = new MarketDataService(
    marketDataRepository,
    tickerCatalog,
  );
  const tickerController = new TickerController(marketDataService);

  const context = createApplicationContext({
    tickerCatalog,
    marketDataRepository,
    marketDataService,
    tickerController,
  });

  assert.strictEqual(context.tickerCatalog, tickerCatalog);
  assert.strictEqual(context.marketDataRepository, marketDataRepository);
  assert.strictEqual(context.marketDataService, marketDataService);
  assert.strictEqual(context.tickerController, tickerController);
});
