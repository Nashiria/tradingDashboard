import { PriceUpdate, Ticker, TickerWithPrice } from '../models/Ticker';

const MOCK_TICKERS: readonly Ticker[] = [
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    basePrice: 1.085,
    type: 'Forex',
    isFavorite: true,
    inPortfolio: true,
    icon: 'https://flagcdn.com/w40/eu.png|https://flagcdn.com/w40/us.png',
  },
  {
    symbol: 'GBP/JPY',
    name: 'British Pound / Yen',
    basePrice: 190.2,
    type: 'Forex',
    isFavorite: false,
    inPortfolio: false,
    icon: 'https://flagcdn.com/w40/gb.png|https://flagcdn.com/w40/jp.png',
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Yen',
    basePrice: 151.4,
    type: 'Forex',
    isFavorite: true,
    inPortfolio: false,
    icon: 'https://flagcdn.com/w40/us.png|https://flagcdn.com/w40/jp.png',
  },
  {
    symbol: 'XAU/USD',
    name: 'Gold',
    basePrice: 2350.5,
    type: 'Metals',
    isFavorite: true,
    inPortfolio: true,
    icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/paxg.png|https://flagcdn.com/w40/us.png',
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver',
    basePrice: 28.3,
    type: 'Metals',
    isFavorite: false,
    inPortfolio: false,
    icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ltc.png|https://flagcdn.com/w40/us.png',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    basePrice: 175.5,
    type: 'Shares',
    isFavorite: true,
    inPortfolio: false,
    icon: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    basePrice: 205.2,
    type: 'Shares',
    isFavorite: false,
    inPortfolio: true,
    icon: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    basePrice: 900.5,
    type: 'Shares',
    isFavorite: true,
    inPortfolio: true,
    icon: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    basePrice: 64200.0,
    type: 'Crypto',
    isFavorite: true,
    inPortfolio: true,
    icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png|https://flagcdn.com/w40/us.png',
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    basePrice: 3100.0,
    type: 'Crypto',
    isFavorite: false,
    inPortfolio: false,
    icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png|https://flagcdn.com/w40/us.png',
  },
  {
    symbol: 'US30',
    name: 'Wall Street 30',
    basePrice: 39000.0,
    type: 'Indices',
    isFavorite: false,
    inPortfolio: false,
    icon: 'https://www.google.com/s2/favicons?domain=wsj.com&sz=128',
  },
  {
    symbol: 'SPX500',
    name: 'S&P 500',
    basePrice: 5100.0,
    type: 'Indices',
    isFavorite: true,
    inPortfolio: false,
    icon: 'https://www.google.com/s2/favicons?domain=spglobal.com&sz=128',
  },
  {
    symbol: 'USOIL',
    name: 'Crude Oil',
    basePrice: 82.5,
    type: 'Commodities',
    isFavorite: false,
    inPortfolio: true,
    icon: 'https://www.google.com/s2/favicons?domain=oilprice.com&sz=128',
  },
];

const precisionForTicker = (symbol: string) => {
  if (symbol.includes('JPY')) {
    return 3;
  }

  if (symbol === 'BTC-USD' || symbol === 'ETH-USD') {
    return 2;
  }

  if (symbol === 'US30' || symbol === 'SPX500' || symbol === 'USOIL') {
    return 2;
  }

  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
    return 2;
  }

  return 5;
};

const volatilityForTicker = (symbol: string) => {
  if (symbol === 'BTC-USD' || symbol === 'ETH-USD') {
    return 0.004;
  }

  if (
    symbol.startsWith('XAU') ||
    symbol.startsWith('XAG') ||
    symbol === 'USOIL'
  ) {
    return 0.0025;
  }

  if (symbol === 'US30' || symbol === 'SPX500') {
    return 0.0018;
  }

  if (symbol.includes('/')) {
    return 0.0008;
  }

  return 0.002;
};

const roundPrice = (symbol: string, price: number) =>
  Number(price.toFixed(precisionForTicker(symbol)));

export const createMockTickers = (): TickerWithPrice[] =>
  MOCK_TICKERS.map((ticker, index) => {
    const drift = Math.sin(index + 1) * volatilityForTicker(ticker.symbol) * 2;
    return {
      ...ticker,
      currentPrice: roundPrice(ticker.symbol, ticker.basePrice * (1 + drift)),
    };
  });

export const evolveMockTickers = (
  tickers: TickerWithPrice[],
): TickerWithPrice[] =>
  tickers.map((ticker, index) => {
    const currentPrice = ticker.currentPrice ?? ticker.basePrice;
    const randomComponent =
      (Math.random() - 0.5) * volatilityForTicker(ticker.symbol);
    const waveComponent =
      Math.sin(Date.now() / 1000 + index) *
      volatilityForTicker(ticker.symbol) *
      0.35;
    const nextPrice = currentPrice * (1 + randomComponent + waveComponent);

    return {
      ...ticker,
      currentPrice: roundPrice(
        ticker.symbol,
        Math.max(nextPrice, ticker.basePrice * 0.2),
      ),
    };
  });

export const createMockHistory = (
  symbol: string,
  referencePrice?: number,
): PriceUpdate[] => {
  const ticker = MOCK_TICKERS.find((candidate) => candidate.symbol === symbol);
  const basePrice = referencePrice ?? ticker?.basePrice ?? 100;
  const now = Date.now();
  const volatility = volatilityForTicker(symbol);
  let currentPrice = basePrice;

  return Array.from({ length: 600 }, (_value, index) => {
    const age = 599 - index;
    const wave = Math.sin(index / 18) * volatility * 0.8;
    const noise = (Math.random() - 0.5) * volatility * 0.6;
    currentPrice = currentPrice * (1 + wave + noise);

    return {
      symbol,
      price: roundPrice(symbol, Math.max(currentPrice, basePrice * 0.2)),
      timestamp: now - age * 1000,
    };
  });
};
