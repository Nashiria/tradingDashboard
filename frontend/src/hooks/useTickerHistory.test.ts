import { act, renderHook, waitFor } from '@testing-library/react';
import { useTickerHistory } from './useTickerHistory';
import { marketDataApi } from '../services/marketDataApi';
import { useWebSocket } from '../context/WebSocketContext';
import { PriceUpdate } from '../models/Ticker';
import { MockWebSocket } from '../testUtils/mockWebSocket';

jest.mock('../services/marketDataApi', () => ({
  marketDataApi: {
    getTickerHistory: jest.fn(),
  },
}));

jest.mock('../context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}));

const mockedGetTickerHistory =
  marketDataApi.getTickerHistory as jest.MockedFunction<
    typeof marketDataApi.getTickerHistory
  >;
const mockedUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;

const createUpdate = (timestamp: number, symbol = 'AAPL'): PriceUpdate => ({
  symbol,
  price: 100 + timestamp,
  timestamp,
});

describe('useTickerHistory', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    mockedGetTickerHistory.mockReset();
    mockedUseWebSocket.mockReset();
  });

  test('loads history, manages websocket subscriptions, and caps live updates', async () => {
    const initialHistory = Array.from({ length: 600 }, (_, index) =>
      createUpdate(index),
    );
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    socket.readyState = MockWebSocket.OPEN;
    mockedUseWebSocket.mockReturnValue({
      ws: socket as unknown as WebSocket,
      isConnected: true,
    });
    mockedGetTickerHistory.mockResolvedValue(initialHistory);

    const { result, unmount } = renderHook(() => useTickerHistory('AAPL'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetTickerHistory).toHaveBeenCalledWith('AAPL');
    expect(socket.sent).toContain(
      JSON.stringify({ type: 'SUBSCRIBE', tickers: ['AAPL'] }),
    );
    expect(result.current.history).toHaveLength(600);

    act(() => {
      socket.emitMessage(
        JSON.stringify({ type: 'PRICE_UPDATE', data: createUpdate(600) }),
      );
      socket.emitMessage(
        JSON.stringify({
          type: 'PRICE_UPDATE',
          data: createUpdate(601, 'MSFT'),
        }),
      );
    });

    expect(result.current.history).toHaveLength(600);
    expect(result.current.history[0].timestamp).toBe(1);
    expect(result.current.history[599].timestamp).toBe(600);
    expect(result.current.isUsingFallbackHistory).toBe(false);

    unmount();

    expect(socket.sent).toContain(
      JSON.stringify({ type: 'UNSUBSCRIBE', tickers: ['AAPL'] }),
    );
  });

  test('skips fetches and subscriptions when no symbol is selected', () => {
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    socket.readyState = MockWebSocket.OPEN;
    mockedUseWebSocket.mockReturnValue({
      ws: socket as unknown as WebSocket,
      isConnected: true,
    });

    const { result } = renderHook(() => useTickerHistory(null));

    expect(result.current.history).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockedGetTickerHistory).not.toHaveBeenCalled();
    expect(socket.sent).toEqual([]);
  });

  test('falls back to generated history when the API is unavailable', async () => {
    mockedUseWebSocket.mockReturnValue({ ws: null, isConnected: false });
    mockedGetTickerHistory.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTickerHistory('EUR/USD'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.history).toHaveLength(600);
    expect(result.current.isUsingFallbackHistory).toBe(true);
  });
});
