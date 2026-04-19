import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useAuth } from './context/AuthContext';
import { useWebSocket } from './context/WebSocketContext';
import { useMarketData } from './hooks/useMarketData';
import { useTickerHistory } from './hooks/useTickerHistory';
import { usePortfolio } from './context/PortfolioContext';
import {
  subscribeToTickers,
  unsubscribeFromTickers,
} from './services/marketDataSocket';

jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: jest.fn(),
}));

jest.mock('./context/PortfolioContext', () => ({
  PortfolioProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  usePortfolio: jest.fn(),
}));

jest.mock('./context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ws-provider">{children}</div>
  ),
  useWebSocket: jest.fn(),
}));

jest.mock('./hooks/useMarketData', () => ({
  useMarketData: jest.fn(),
}));

jest.mock('./hooks/useTickerHistory', () => ({
  useTickerHistory: jest.fn(),
}));

jest.mock('./components/ChartComponent', () => ({
  ChartComponent: ({ symbol, data }: { symbol: string; data: unknown[] }) => (
    <div data-testid="chart-mock">
      {symbol}:{data.length}
    </div>
  ),
}));

jest.mock('./services/marketDataSocket', () => ({
  subscribeToTickers: jest.fn(),
  unsubscribeFromTickers: jest.fn(),
}));

import App from './App';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;
const mockedUseMarketData = useMarketData as jest.MockedFunction<
  typeof useMarketData
>;
const mockedUseTickerHistory = useTickerHistory as jest.MockedFunction<
  typeof useTickerHistory
>;
const mockedSubscribeToTickers = subscribeToTickers as jest.MockedFunction<
  typeof subscribeToTickers
>;
const mockedUnsubscribeFromTickers =
  unsubscribeFromTickers as jest.MockedFunction<typeof unsubscribeFromTickers>;
const mockedUsePortfolio = usePortfolio as jest.MockedFunction<
  typeof usePortfolio
>;

const tickers = [
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    basePrice: 1.085,
    currentPrice: 1.091,
    type: 'Forex' as const,
    isFavorite: true,
    inPortfolio: true,
    icon: 'eur|usd',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    basePrice: 175.5,
    currentPrice: 182.25,
    type: 'Shares' as const,
    isFavorite: false,
    inPortfolio: false,
    icon: 'apple',
  },
];

describe('App', () => {
  beforeEach(() => {
    mockedSubscribeToTickers.mockReset();
    mockedUnsubscribeFromTickers.mockReset();
    mockedUseAuth.mockReset();
    mockedUseWebSocket.mockReset();
    mockedUseMarketData.mockReset();
    mockedUseTickerHistory.mockReset();
    mockedUsePortfolio.mockReset();

    mockedUsePortfolio.mockReturnValue({
      balance: 1000000,
      totalDeposited: 1000000,
      positions: [],
      deposit: jest.fn(),
      openPosition: jest.fn(),
      closePosition: jest.fn(),
    });

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'demo@mockbank.com', name: 'Demo Trader' },
      token: 'token-1',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
    mockedUseWebSocket.mockReturnValue({
      ws: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as unknown as WebSocket,
      isConnected: true,
      notifications: [],
      dismissNotification: jest.fn(),
    });
    mockedUseMarketData.mockReturnValue({
      tickers,
      isUsingFallbackData: false,
    });
    mockedUseTickerHistory.mockImplementation((symbol) => ({
      history:
        symbol === 'AAPL'
          ? [{ symbol: 'AAPL', price: 182.25, timestamp: 2 }]
          : [{ symbol: 'EUR/USD', price: 1.091, timestamp: 1 }],
      isLoading: false,
      isUsingFallbackHistory: false,
    }));
  });

  test('renders the live dashboard inside the websocket provider and updates selection-driven UI', () => {
    const { container } = render(<App />);

    expect(screen.getByTestId('ws-provider')).toBeInTheDocument();
    expect(screen.getByTestId('chart-mock')).toHaveTextContent('EUR/USD:1');
    expect(screen.getByText('Buy / Long EUR/USD')).toBeInTheDocument();
    expect(mockedSubscribeToTickers).toHaveBeenCalledWith(expect.anything(), [
      'AAPL',
      'EUR/USD',
    ]);

    const aaplCard = screen.getByText('Apple Inc.').closest('.symbol-card');
    expect(aaplCard).not.toBeNull();

    if (!aaplCard) {
      throw new Error('Expected AAPL symbol card to be present.');
    }

    fireEvent.click(aaplCard);

    expect(screen.getByTestId('chart-mock')).toHaveTextContent('AAPL:1');
    expect(screen.getByText('Buy / Long AAPL')).toBeInTheDocument();
    expect(mockedUnsubscribeFromTickers).toHaveBeenCalledWith(
      expect.anything(),
      ['AAPL', 'EUR/USD'],
    );
    expect(container.querySelector('.symbol-card.active')).toHaveTextContent(
      'AAPL',
    );
  });

  test('filters symbols when switching tabs', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Favorites'));

    expect(screen.getAllByText('EUR/USD').length).toBeGreaterThan(0);
    expect(screen.queryByText('Apple Inc.')).not.toBeInTheDocument();
  });

  test('keeps dashboard visible for guests and opens sign-in prompt for protected actions', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
    mockedUseMarketData.mockReturnValue({
      tickers,
      isUsingFallbackData: false,
    });

    render(<App />);

    expect(screen.getByTestId('chart-mock')).toHaveTextContent('EUR/USD:1');

    fireEvent.click(screen.getByText('Favorites'));

    expect(
      screen.getByText('Sign in when you want to trade'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to open your favorites view.'),
    ).toBeInTheDocument();
  });
});
