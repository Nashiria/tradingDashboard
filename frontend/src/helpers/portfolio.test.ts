import { calculatePortfolioMetrics, calculatePositionPnl } from './portfolio';

describe('portfolio helpers', () => {
  test('calculates position pnl for buy and sell positions', () => {
    expect(
      calculatePositionPnl(
        {
          id: 'buy-1',
          symbol: 'EUR/USD',
          side: 'buy',
          units: 1000,
          openPrice: 1.1,
          margin: 100,
        },
        1.12,
      ),
    ).toBeCloseTo(20);

    expect(
      calculatePositionPnl(
        {
          id: 'sell-1',
          symbol: 'AAPL',
          side: 'sell',
          units: 10,
          openPrice: 200,
          margin: 150,
        },
        190,
      ),
    ).toBeCloseTo(100);
  });

  test('derives portfolio metrics from positions and current ticker prices', () => {
    const metrics = calculatePortfolioMetrics({
      balance: 9800,
      totalDeposited: 10000,
      positions: [
        {
          id: 'buy-1',
          symbol: 'EUR/USD',
          side: 'buy',
          units: 1000,
          openPrice: 1.1,
          margin: 100,
        },
        {
          id: 'sell-1',
          symbol: 'AAPL',
          side: 'sell',
          units: 10,
          openPrice: 200,
          margin: 150,
        },
      ],
      tickers: [
        {
          symbol: 'EUR/USD',
          name: 'Euro / US Dollar',
          basePrice: 1.085,
          currentPrice: 1.12,
          type: 'Forex',
          isFavorite: true,
          inPortfolio: true,
          icon: 'eur|usd',
        },
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          basePrice: 175.5,
          currentPrice: 190,
          type: 'Shares',
          isFavorite: false,
          inPortfolio: false,
          icon: 'apple',
        },
      ],
    });

    expect(metrics.marginUsed).toBe(250);
    expect(metrics.floatingPnl).toBeCloseTo(120);
    expect(metrics.equity).toBeCloseTo(10170);
    expect(metrics.freeMargin).toBeCloseTo(9920);
    expect(metrics.marginLevel).toBeCloseTo(4068);
    expect(metrics.changePct).toBeCloseTo(1.7);
  });
});
