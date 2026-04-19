import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarketDataProvider, useMarketData } from './MarketDataContext';
import * as marketDataHook from '../hooks/useMarketData';

jest.mock('../hooks/useMarketData', () => ({
  useMarketDataSource: jest.fn(),
}));

const mockedUseMarketDataSource =
  marketDataHook.useMarketDataSource as jest.MockedFunction<
    typeof marketDataHook.useMarketDataSource
  >;

const Probe = () => {
  const { tickers, isUsingFallbackData } = useMarketData();

  return (
    <div data-testid="market-data-probe">
      {tickers.length}:{isUsingFallbackData ? 'fallback' : 'live'}
    </div>
  );
};

describe('MarketDataProvider', () => {
  beforeEach(() => {
    mockedUseMarketDataSource.mockReset();
  });

  test('shares a single market data source with descendants', () => {
    mockedUseMarketDataSource.mockReturnValue({
      tickers: [
        {
          symbol: 'EUR/USD',
          name: 'Euro / US Dollar',
          basePrice: 1.085,
          currentPrice: 1.091,
          type: 'Forex',
          isFavorite: true,
          inPortfolio: true,
          icon: 'eur|usd',
        },
      ],
      isUsingFallbackData: false,
      toggleFavorite: jest.fn(),
    });

    render(
      <MarketDataProvider>
        <Probe />
      </MarketDataProvider>,
    );

    expect(screen.getByTestId('market-data-probe')).toHaveTextContent('1:live');
    expect(mockedUseMarketDataSource).toHaveBeenCalledTimes(1);
  });
});
