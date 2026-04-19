import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from './WebSocketContext';
import { MockWebSocket } from '../testUtils/mockWebSocket';
import { sendHeartbeat } from '../services/marketDataSocket';

jest.mock('../services/marketDataSocket', () => ({
  parseMarketDataMessage: jest.fn((data: unknown) =>
    data === 'pong' ? { type: 'PONG' } : null,
  ),
  sendHeartbeat: jest.fn(),
}));

const mockedSendHeartbeat = sendHeartbeat as jest.MockedFunction<
  typeof sendHeartbeat
>;

const originalWebSocket = global.WebSocket;

const Probe = () => {
  const { ws, isConnected } = useWebSocket();

  return (
    <div data-testid="ws-state">
      {isConnected ? 'connected' : 'disconnected'}:{ws ? 'socket' : 'none'}
    </div>
  );
};

describe('WebSocketProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.reset();
    mockedSendHeartbeat.mockClear();
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
  });

  test('connects, exposes status, and sends heartbeats while open', () => {
    const { unmount } = render(
      <WebSocketProvider>
        <Probe />
      </WebSocketProvider>,
    );

    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe('ws://localhost:8080/ws');
    expect(screen.getByTestId('ws-state')).toHaveTextContent(
      'disconnected:socket',
    );

    act(() => {
      socket.emitOpen();
    });

    expect(screen.getByTestId('ws-state')).toHaveTextContent(
      'connected:socket',
    );

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockedSendHeartbeat).toHaveBeenCalledWith(
      socket as unknown as WebSocket,
    );

    unmount();

    expect(socket.readyState).toBe(MockWebSocket.CLOSED);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  test('reconnects after an unexpected close with backoff', () => {
    render(
      <WebSocketProvider>
        <Probe />
      </WebSocketProvider>,
    );

    const firstSocket = MockWebSocket.instances[0];

    act(() => {
      firstSocket.emitOpen();
      firstSocket.emitClose();
    });

    expect(screen.getByTestId('ws-state')).toHaveTextContent(
      'disconnected:none',
    );

    act(() => {
      jest.advanceTimersByTime(999);
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toBe('ws://localhost:8080/ws');
  });

  test('stops reconnecting after repeated failures', () => {
    render(
      <WebSocketProvider>
        <Probe />
      </WebSocketProvider>,
    );

    act(() => {
      MockWebSocket.instances[0].emitClose();
      jest.advanceTimersByTime(1000);
      MockWebSocket.instances[1].emitClose();
      jest.advanceTimersByTime(2000);
      MockWebSocket.instances[2].emitClose();
      jest.advanceTimersByTime(4000);
      MockWebSocket.instances[3].emitClose();
      jest.advanceTimersByTime(30000);
    });

    expect(MockWebSocket.instances).toHaveLength(4);
  });
});
