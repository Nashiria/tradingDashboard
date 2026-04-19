import { act, renderHook } from '@testing-library/react';
import { useMarketData } from './useMarketData';
import { useWebSocket } from '../context/WebSocketContext';
import { marketDataApi } from '../services/marketDataApi';
import { MockWebSocket } from '../testUtils/mockWebSocket';

jest.mock('../context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('../services/marketDataApi', () => ({
  marketDataApi: {
    getTickers: jest.fn(),
  },
}));

const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;
const mockedGetTickers = marketDataApi.getTickers as jest.MockedFunction<
  typeof marketDataApi.getTickers
>;

describe('useMarketData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.reset();
    mockedUseWebSocket.mockReset();
    mockedGetTickers.mockReset();
    mockedGetTickers.mockResolvedValue([]);
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
    mockedUseWebSocket.mockReturnValue({ ws: null, isConnected: false });
    mockedGetTickers.mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() => useMarketData());

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.tickers.length).toBeGreaterThan(0);
    expect(result.current.isUsingFallbackData).toBe(true);

    unmount();
  });
});
