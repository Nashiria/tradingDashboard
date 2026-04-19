import {
  Ticker,
  TickerWithPrice,
  PriceUpdate,
} from '../../domain/models/Ticker';
import { IMarketDataRepository } from '../../domain/repositories/IMarketDataRepository';
import { DEFAULT_TICKERS } from '../../config/marketTickers';
import { createRandomWalkPercent } from '../../config/marketSimulation';
import { AlertService } from './AlertService';

export interface HistoryOptions {
  from?: number;
  to?: number;
  limit?: number;
}

export interface MarketDataReadPort {
  getTickers(): Promise<TickerWithPrice[]>;
  getTicker(symbol: string): Promise<TickerWithPrice | undefined>;
  hasTicker(symbol: string): boolean;
  getHistory(symbol: string, options?: HistoryOptions): Promise<PriceUpdate[]>;
}

export class MarketDataService implements MarketDataReadPort {
  constructor(
    private readonly repository: IMarketDataRepository,
    private readonly tickers: readonly Ticker[] = DEFAULT_TICKERS,
    private readonly alertService?: AlertService,
  ) {}

  private intervalId?: NodeJS.Timeout;

  /**
   * Seeds a startup price trail so the UI has useful history before live ticks arrive.
   */
  public async initData() {
    const exists = await this.repository.hasPrices();
    if (exists) {
      return;
    }

    const now = Date.now();
    for (const ticker of this.tickers) {
      let currentPrice = ticker.basePrice;
      const history: PriceUpdate[] = [];

      for (let i = 5000; i > 0; i--) {
        const changePercent = createRandomWalkPercent(ticker.type, 'seed');
        currentPrice = Number(
          (currentPrice + currentPrice * changePercent).toFixed(5),
        );

        history.push({
          symbol: ticker.symbol,
          price: currentPrice,
          timestamp: now - i * 1000,
        });
      }

      await this.repository.setPrice(ticker.symbol, currentPrice);
      await this.repository.saveHistory(ticker.symbol, history);
    }
  }

  /**
   * Merges static ticker metadata with the latest stored price snapshot.
   */
  public async getTickers(): Promise<TickerWithPrice[]> {
    const prices = await this.repository.getAllPrices();
    return this.tickers.map((ticker) => ({
      ...ticker,
      currentPrice:
        prices[ticker.symbol] !== undefined
          ? prices[ticker.symbol]
          : ticker.basePrice,
    }));
  }

  public async getTicker(symbol: string): Promise<TickerWithPrice | undefined> {
    const ticker = this.tickers.find(
      (candidate) => candidate.symbol === symbol,
    );

    if (!ticker) {
      return undefined;
    }

    const prices = await this.repository.getAllPrices();

    return {
      ...ticker,
      currentPrice:
        prices[ticker.symbol] !== undefined
          ? prices[ticker.symbol]
          : ticker.basePrice,
    };
  }

  public hasTicker(symbol: string): boolean {
    return this.tickers.some((ticker) => ticker.symbol === symbol);
  }

  /**
   * Filters stored history server-side so callers can request just the visible window.
   */
  public async getHistory(
    symbol: string,
    options: HistoryOptions = {},
  ): Promise<PriceUpdate[]> {
    const history = await this.repository.getHistory(symbol);

    const filteredHistory = history.filter((update) => {
      if (options.from !== undefined && update.timestamp < options.from) {
        return false;
      }

      if (options.to !== undefined && update.timestamp > options.to) {
        return false;
      }

      return true;
    });

    if (
      options.limit === undefined ||
      filteredHistory.length <= options.limit
    ) {
      return filteredHistory;
    }

    return filteredHistory.slice(-options.limit);
  }

  /**
   * Starts the price simulator that feeds live updates into storage, sockets, and alerts.
   */
  public startSimulation() {
    this.intervalId = setInterval(async () => {
      try {
        const prices = await this.repository.getAllPrices();
        const batchSize = 50;

        for (let i = 0; i < this.tickers.length; i++) {
          const ticker = this.tickers[i];

          // Yield to the event loop between micro-batches to avoid synchronous spikes
          if (i > 0 && i % batchSize === 0) {
            await new Promise((resolve) => setImmediate(resolve));
          }

          const current =
            prices[ticker.symbol] !== undefined
              ? prices[ticker.symbol]
              : ticker.basePrice;

          const changePercent = createRandomWalkPercent(ticker.type, 'live');
          const changeAmount = current * changePercent;
          const newPrice = Number((current + changeAmount).toFixed(5));

          await this.repository.setPrice(ticker.symbol, newPrice);

          const update: PriceUpdate = {
            symbol: ticker.symbol,
            price: newPrice,
            timestamp: Date.now(),
          };

          await this.repository.saveHistory(ticker.symbol, [update]);
          await this.repository.publishPriceUpdate(update);
          await this.alertService?.processPriceUpdate(update);
        }
      } catch (err) {
        console.error('Error in simulation interval:', err);
      }
    }, 1000);
  }

  /**
   * Stops the simulator so shutdowns and tests do not leave background timers running.
   */
  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
