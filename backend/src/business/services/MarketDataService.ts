import { Ticker, PriceUpdate } from '../../domain/models/Ticker';
import { IMarketDataRepository } from '../../domain/repositories/IMarketDataRepository';

export class MarketDataService {
  private repository: IMarketDataRepository;

  constructor(repository: IMarketDataRepository) {
    this.repository = repository;
  }

  private tickers: Ticker[] = [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.0850, type: 'Forex', isFavorite: true, inPortfolio: true, icon: 'https://flagcdn.com/w40/eu.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'GBP/JPY', name: 'British Pound / Yen', basePrice: 190.20, type: 'Forex', isFavorite: false, inPortfolio: false, icon: 'https://flagcdn.com/w40/gb.png|https://flagcdn.com/w40/jp.png' },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 151.40, type: 'Forex', isFavorite: true, inPortfolio: false, icon: 'https://flagcdn.com/w40/us.png|https://flagcdn.com/w40/jp.png' },
    { symbol: 'XAU/USD', name: 'Gold', basePrice: 2350.50, type: 'Metals', isFavorite: true, inPortfolio: true, icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/paxg.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'XAG/USD', name: 'Silver', basePrice: 28.30, type: 'Metals', isFavorite: false, inPortfolio: false, icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ltc.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 175.50, type: 'Shares', isFavorite: true, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128' },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 205.20, type: 'Shares', isFavorite: false, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 900.50, type: 'Shares', isFavorite: true, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128' },
    { symbol: 'BTC-USD', name: 'Bitcoin', basePrice: 64200.00, type: 'Crypto', isFavorite: true, inPortfolio: true, icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'ETH-USD', name: 'Ethereum', basePrice: 3100.00, type: 'Crypto', isFavorite: false, inPortfolio: false, icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'US30', name: 'Wall Street 30', basePrice: 39000.00, type: 'Indices', isFavorite: false, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=wsj.com&sz=128' },
    { symbol: 'SPX500', name: 'S&P 500', basePrice: 5100.00, type: 'Indices', isFavorite: true, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=spglobal.com&sz=128' },
    { symbol: 'USOIL', name: 'Crude Oil', basePrice: 82.50, type: 'Commodities', isFavorite: false, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=oilprice.com&sz=128' }
  ];
  
  private intervalId?: NodeJS.Timeout;

  /**
   * Summary: Initializes market data in the repository by seeding simulated historical prices.
   * Details: Acts as a bootstrapper. Will skip initialization if prices already exist.
   * Service: MarketDataService.initData
   * @returns Void promise upon completion.
   */
  public async initData() {
    const exists = await this.repository.hasPrices();
    if (exists) return;

    const now = Date.now();
    // Seed initial price history for each ticker over the last 600 seconds (10 minutes)
    for (const t of this.tickers) {
      let currentPrice = t.basePrice;
      const history: PriceUpdate[] = [];
      
      // Generate historical data points by simulating a random walk
      for (let i = 600; i > 0; i--) {
        // Calculate a random percentage change between -0.15% and +0.15% per tick
        const changePercent = (Math.random() * 0.003) - 0.0015; 
        currentPrice = Number((currentPrice + (currentPrice * changePercent)).toFixed(5));
        
        // Record the historical price at this past timestamp
        history.push({
          symbol: t.symbol,
          price: currentPrice,
          timestamp: now - (i * 1000)
        });
      }

      // Persist the final calculated price and its generated history to the repository
      await this.repository.setPrice(t.symbol, currentPrice);
      await this.repository.saveHistory(t.symbol, history);
    }
  }

  /**
   * Summary: Returns a combined list of predefined tickers and their latest known real-time prices from the repository.
   * Service: MarketDataService.getTickers
   * @returns A promise resolving to an array of extended `Ticker` objects containing `currentPrice`.
   */
  public async getTickers() {
    const prices = await this.repository.getAllPrices();
    return this.tickers.map(t => ({
      ...t,
      currentPrice: prices[t.symbol] !== undefined ? prices[t.symbol] : t.basePrice
    }));
  }

  /**
   * Summary: Fetches historical pricing telemetry for a specific ticker.
   * Service: MarketDataService.getHistory
   * @param symbol - The stock or crypto symbol to search memory/repository for.
   * @returns A promise resolving to an array of trailing `PriceUpdate` values.
   */
  public async getHistory(symbol: string): Promise<PriceUpdate[]> {
    return this.repository.getHistory(symbol);
  }

  /**
   * Summary: Begins a scheduled background task that iterates all tracked tickers, calculates price variance, and emits updates.
   * Service: MarketDataService.startSimulation
   */
  public startSimulation() {
    // Start an interval that periodically updates prices for all tickers
    this.intervalId = setInterval(async () => {
      try {
        // Retrieve current prices across the board to use as a baseline for new ticks
        const prices = await this.repository.getAllPrices();
        
        for (const ticker of this.tickers) {
          // Fallback to basePrice if the current price isn't found in the repository
          const current = prices[ticker.symbol] !== undefined ? prices[ticker.symbol] : ticker.basePrice;
          
          // Compute a random percentage change ranging from -0.3% to +0.3%
          const changePercent = (Math.random() * 0.006) - 0.003; 
          
          // Apply the randomized delta to the current price and round it for financial formatting
          const changeAmount = current * changePercent;
          const newPrice = Number((current + changeAmount).toFixed(5));
          
          // Save the freshly updated price to the data store
          await this.repository.setPrice(ticker.symbol, newPrice);

          const update: PriceUpdate = {
            symbol: ticker.symbol,
            price: newPrice,
            timestamp: Date.now()
          };

          // Append this tick to the history list and broadcast it to connected clients
          await this.repository.saveHistory(ticker.symbol, [update]);
          await this.repository.publishPriceUpdate(update);
        }
      } catch (err) {
        console.error('Error in simulation interval:', err);
      }
    }, 1000); // Ticks execute every 1 second
  }

  /**
   * Summary: Stops the background ticker simulation interval if it is running.
   * Service: MarketDataService.stopSimulation
   */
  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
