import { EventEmitter } from 'events';
import { Ticker, PriceUpdate } from '../../domain/models/Ticker';

export class MarketDataService extends EventEmitter {
  private tickers: Ticker[] = [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.0850, type: 'Forex', isFavorite: true, inPortfolio: true, icon: 'https://flagcdn.com/w40/eu.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'GBP/JPY', name: 'British Pound / Yen', basePrice: 190.20, type: 'Forex', isFavorite: false, inPortfolio: false, icon: 'https://flagcdn.com/w40/gb.png|https://flagcdn.com/w40/jp.png' },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 151.40, type: 'Forex', isFavorite: true, inPortfolio: false, icon: 'https://flagcdn.com/w40/us.png|https://flagcdn.com/w40/jp.png' },
    { symbol: 'XAU/USD', name: 'Gold', basePrice: 2350.50, type: 'Metals', isFavorite: true, inPortfolio: true, icon: 'https://ui-avatars.com/api/?name=XAU&background=FFD700&color=000|https://flagcdn.com/w40/us.png' },
    { symbol: 'XAG/USD', name: 'Silver', basePrice: 28.30, type: 'Metals', isFavorite: false, inPortfolio: false, icon: 'https://ui-avatars.com/api/?name=XAG&background=C0C0C0&color=000|https://flagcdn.com/w40/us.png' },
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 175.50, type: 'Shares', isFavorite: true, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128' },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 205.20, type: 'Shares', isFavorite: false, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 900.50, type: 'Shares', isFavorite: true, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128' },
    { symbol: 'BTC-USD', name: 'Bitcoin', basePrice: 64200.00, type: 'Crypto', isFavorite: true, inPortfolio: true, icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'ETH-USD', name: 'Ethereum', basePrice: 3100.00, type: 'Crypto', isFavorite: false, inPortfolio: false, icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png|https://flagcdn.com/w40/us.png' },
    { symbol: 'US30', name: 'Wall Street 30', basePrice: 39000.00, type: 'Indices', isFavorite: false, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=wsj.com&sz=128' },
    { symbol: 'SPX500', name: 'S&P 500', basePrice: 5100.00, type: 'Indices', isFavorite: true, inPortfolio: false, icon: 'https://www.google.com/s2/favicons?domain=spglobal.com&sz=128' },
    { symbol: 'USOIL', name: 'Crude Oil', basePrice: 82.50, type: 'Commodities', isFavorite: false, inPortfolio: true, icon: 'https://www.google.com/s2/favicons?domain=oilprice.com&sz=128' }
  ];
  
  private currentPrices: Map<string, number> = new Map();
  private history: Map<string, PriceUpdate[]> = new Map();
  private intervalId?: NodeJS.Timeout;

  constructor() {
    super();
    // Initialize base prices and pre-fill 10 minutes of historical data (600 points)
    const now = Date.now();
    this.tickers.forEach(t => {
      let currentPrice = t.basePrice;
      const history: PriceUpdate[] = [];
      
      for (let i = 600; i > 0; i--) {
        // Smoother volatility for historical generation (±0.15%)
        const changePercent = (Math.random() * 0.003) - 0.0015; 
        currentPrice = Number((currentPrice + (currentPrice * changePercent)).toFixed(2));
        
        history.push({
          symbol: t.symbol,
          price: currentPrice,
          timestamp: now - (i * 1000)
        });
      }

      this.currentPrices.set(t.symbol, currentPrice);
      this.history.set(t.symbol, history);
    });
  }

  /**
   * Summary: Returns list of all tickers with their latest known price.
   * Service: MarketDataService.getTickers
   *
   * @returns An array of Tickers combined with their simulated `currentPrice`.
   */
  public getTickers() {
    return this.tickers.map(t => ({
      ...t,
      currentPrice: this.currentPrices.get(t.symbol)
    }));
  }

  /**
   * Summary: Returns simulated historical price data points for a specific ticker symbol.
   * Service: MarketDataService.getHistory
   *
   * @param symbol - The ticker symbol (e.g. 'AAPL') to fetch history for.
   * @returns An array of `PriceUpdate` objects representing trailing historical data.
   */
  public getHistory(symbol: string): PriceUpdate[] {
    return this.history.get(symbol) || [];
  }

  /**
   * Summary: Simulates periodic market price movements over an interval.
   * Details: Fires every second, updates prices pseudo-randomly (-0.3% to +0.3%),
   * stores up to 60 historical points, and emits 'priceUpdate' events.
   * Service: MarketDataService.startSimulation
   */
  public startSimulation() {
    // Generate new price points every 1 second
    this.intervalId = setInterval(() => {
      this.tickers.forEach(ticker => {
        const current = this.currentPrices.get(ticker.symbol)!;
        
        // Random price movement between -0.3% and +0.3%
        const changePercent = (Math.random() * 0.006) - 0.003; 
        const changeAmount = current * changePercent;
        const newPrice = Number((current + changeAmount).toFixed(2));
        
        this.currentPrices.set(ticker.symbol, newPrice);

        const update: PriceUpdate = {
          symbol: ticker.symbol,
          price: newPrice,
          timestamp: Date.now()
        };

        // Maintain a history of the last 600 points (10 minutes of data for the chart)
        const tickerHistory = this.history.get(ticker.symbol)!;
        tickerHistory.push(update);
        if (tickerHistory.length > 600) {
          tickerHistory.shift();
        }

        // Emit the event to be picked up by the WebSocket
        this.emit('priceUpdate', update);
      });
    }, 1000);
  }

  /**
   * Summary: Stops the ongoing market simulation.
   * Details: Clears the simulated price update interval if one is running.
   * Service: MarketDataService.stopSimulation
   */
  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Export a singleton instance
export const marketDataService = new MarketDataService();