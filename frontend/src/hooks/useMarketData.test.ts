import { act, renderHook } from '@testing-library/react';
import { useMarketData } from './useMarketData';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { marketDataApi } from '../services/marketDataApi';
import { MockWebSocket } from '../testUtils/mockWebSocket';

jest.mock('../context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/marketDataApi', () => ({
  marketDataApi: {
    getTickers: jest.fn(),
  },
}));

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedGetTickers = marketDataApi.getTickers as jest.MockedFunction<
  typeof marketDataApi.getTickers
>;

describe('useMarketData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    MockWebSocket.reset();
    mockedUseWebSocket.mockReset();
    mockedUseAuth.mockReset();
    mockedGetTickers.mockReset();
    mockedGetTickers.mockResolvedValue([]);
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('batches rapid price updates and keeps the latest value per symbol', () => {
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    socket.readyState = MockWebSocket.OPEN;
    mockedUseWebSocket.mockReturnValue({
      ws: socket as unknown as WebSocket,
      isConnected: true,
      connectionState: 'connected',
    });

    const { result } = renderHook(() => useMarketData());

    act(() => {
      socket.emitMessage(
        JSON.stringify({
          type: 'INITIAL_TICKERS',
          data: [
            {
              symbol: 'AAPL',
              name: 'Apple',
              basePrice: 100,
              currentPrice: 100,
              type: 'Shares',
              isFavorite: true,
              inPortfolio: false,
              icon: 'apple',
            },
            {
              symbol: 'MSFT',
              name: 'Microsoft',
              basePrice: 200,
              currentPrice: 200,
              type: 'Shares',
              isFavorite: false,
              inPortfolio: false,
              icon: 'msft',
            },
          ],
        }),
      );
    });

    expect(result.current.tickers.map((ticker) => ticker.currentPrice)).toEqual(
      [100, 200],
    );

    act(() => {
      socket.emitMessage(
        JSON.stringify({
          type: 'PRICE_UPDATE',
          data: { symbol: 'AAPL', price: 101, timestamp: 1 },
        }),
      );
      socket.emitMessage(JSON.stringify({ type: 'AAPL_IGNORED' }));
      socket.emitMessage(
        JSON.stringify({
          type: 'PRICE_UPDATE',
          data: { symbol: 'AAPL', price: 102, timestamp: 2 },
        }),
      );
      socket.emitMessage(
        JSON.stringify({
          type: 'PRICE_UPDATE',
          data: { symbol: 'MSFT', price: 201, timestamp: 3 },
        }),
      );
    });

    expect(result.current.tickers.map((ticker) => ticker.currentPrice)).toEqual(
      [100, 200],
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.tickers.map((ticker) => ticker.currentPrice)).toEqual(
      [102, 201],
    );
    expect(result.current.isUsingFallbackData).toBe(false);
  });

  test('falls back to local demo data when the backend is unavailable', async () => {
    mockedUseWebSocket.mockReturnValue({
      ws: null,
      isConnected: false,
      connectionState: 'reconnecting',
    });
    mockedGetTickers.mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() => useMarketData());

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.tickers.length).toBeGreaterThan(0);
    expect(result.current.isUsingFallbackData).toBe(true);

    unmount();
  });

  test('allows authenticated users to toggle favorites locally', () => {
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    socket.readyState = MockWebSocket.OPEN;
    mockedUseWebSocket.mockReturnValue({
      ws: socket as unknown as WebSocket,
      isConnected: true,
      connectionState: 'connected',
    });
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'demo@mockbank.com',
        name: 'Demo Trader',
        role: 'demo',
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    const { result } = renderHook(() => useMarketData());

    act(() => {
      socket.emitMessage(
        JSON.stringify({
          type: 'INITIAL_TICKERS',
          data: [
            {
              symbol: 'AAPL',
              name: 'Apple',
              basePrice: 100,
              currentPrice: 100,
              type: 'Shares',
              isFavorite: false,
              inPortfolio: false,
              icon: 'apple',
            },
          ],
        }),
      );
    });

    expect(result.current.tickers[0].isFavorite).toBe(false);

    act(() => {
      result.current.toggleFavorite('AAPL');
    });

    expect(result.current.tickers[0].isFavorite).toBe(true);
  });
});
