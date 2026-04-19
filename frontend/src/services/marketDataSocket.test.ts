import {
  subscribeToTicker,
  subscribeToTickers,
  unsubscribeFromTicker,
  unsubscribeFromTickers,
} from './marketDataSocket';
import { MockWebSocket } from '../testUtils/mockWebSocket';

describe('marketDataSocket subscriptions', () => {
  beforeEach(() => {
    MockWebSocket.reset();
  });

  test('queues desired subscriptions until the socket opens', () => {
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    subscribeToTickers(socket as unknown as WebSocket, ['EUR/USD', 'AAPL']);

    expect(socket.sent).toEqual([]);

    socket.emitOpen();

    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'SUBSCRIBE', tickers: ['AAPL', 'EUR/USD'] }),
    ]);
  });

  test('deduplicates overlapping subscriptions and only unsubscribes once', () => {
    const socket = new MockWebSocket('ws://localhost:8080/ws');

    socket.readyState = MockWebSocket.OPEN;

    subscribeToTickers(socket as unknown as WebSocket, ['AAPL', 'EUR/USD']);
    subscribeToTicker(socket as unknown as WebSocket, 'AAPL');

    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'SUBSCRIBE', tickers: ['AAPL', 'EUR/USD'] }),
    ]);

    unsubscribeFromTicker(socket as unknown as WebSocket, 'AAPL');
    expect(socket.sent).toHaveLength(1);

    unsubscribeFromTickers(socket as unknown as WebSocket, ['AAPL', 'EUR/USD']);

    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'SUBSCRIBE', tickers: ['AAPL', 'EUR/USD'] }),
      JSON.stringify({ type: 'UNSUBSCRIBE', tickers: ['AAPL', 'EUR/USD'] }),
    ]);
  });
});
