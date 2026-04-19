import {
  IncomingWebSocketMessage,
  OutgoingWebSocketMessage,
  parseWebSocketMessage,
  serializeWebSocketMessage,
} from '../models/websocket';

type SocketSubscriptionState = {
  desiredSubscriptions: Map<string, number>;
  syncedSubscriptions: Set<string>;
};

const socketStates = new WeakMap<WebSocket, SocketSubscriptionState>();

function getSocketState(ws: WebSocket): SocketSubscriptionState {
  const existingState = socketStates.get(ws);
  if (existingState) {
    return existingState;
  }

  const state: SocketSubscriptionState = {
    desiredSubscriptions: new Map(),
    syncedSubscriptions: new Set(),
  };

  ws.addEventListener('open', () => {
    const currentState = socketStates.get(ws);
    if (!currentState) {
      return;
    }

    const desiredTickers = Array.from(
      currentState.desiredSubscriptions.entries(),
    )
      .filter(([, count]) => count > 0)
      .map(([ticker]) => ticker)
      .sort();

    currentState.syncedSubscriptions.clear();

    if (desiredTickers.length > 0) {
      sendMessage(ws, { type: 'SUBSCRIBE', tickers: desiredTickers });
      desiredTickers.forEach((ticker) =>
        currentState.syncedSubscriptions.add(ticker),
      );
    }
  });

  ws.addEventListener('close', () => {
    socketStates.get(ws)?.syncedSubscriptions.clear();
  });

  socketStates.set(ws, state);
  return state;
}

function sendMessage(ws: WebSocket, message: OutgoingWebSocketMessage) {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(serializeWebSocketMessage(message));
}

export function parseMarketDataMessage(
  data: unknown,
): IncomingWebSocketMessage | null {
  return typeof data === 'string' ? parseWebSocketMessage(data) : null;
}

export function sendHeartbeat(ws: WebSocket) {
  sendMessage(ws, { type: 'PING' });
}

export function subscribeToTicker(ws: WebSocket, ticker: string) {
  subscribeToTickers(ws, [ticker]);
}

export function unsubscribeFromTicker(ws: WebSocket, ticker: string) {
  unsubscribeFromTickers(ws, [ticker]);
}

export function subscribeToTickers(ws: WebSocket, tickers: string[]) {
  const uniqueTickers = Array.from(new Set(tickers)).sort();
  if (uniqueTickers.length === 0) {
    return;
  }

  const state = getSocketState(ws);
  const tickersToSync: string[] = [];

  uniqueTickers.forEach((ticker) => {
    const currentCount = state.desiredSubscriptions.get(ticker) ?? 0;
    state.desiredSubscriptions.set(ticker, currentCount + 1);

    if (currentCount === 0) {
      tickersToSync.push(ticker);
    }
  });

  if (ws.readyState === WebSocket.OPEN && tickersToSync.length > 0) {
    sendMessage(ws, { type: 'SUBSCRIBE', tickers: tickersToSync });
    tickersToSync.forEach((ticker) => state.syncedSubscriptions.add(ticker));
  }
}

export function unsubscribeFromTickers(ws: WebSocket, tickers: string[]) {
  const uniqueTickers = Array.from(new Set(tickers)).sort();
  if (uniqueTickers.length === 0) {
    return;
  }

  const state = getSocketState(ws);
  const tickersToUnsync: string[] = [];

  uniqueTickers.forEach((ticker) => {
    const currentCount = state.desiredSubscriptions.get(ticker);
    if (!currentCount) {
      return;
    }

    if (currentCount === 1) {
      state.desiredSubscriptions.delete(ticker);
      if (state.syncedSubscriptions.has(ticker)) {
        tickersToUnsync.push(ticker);
      }
      return;
    }

    state.desiredSubscriptions.set(ticker, currentCount - 1);
  });

  if (ws.readyState === WebSocket.OPEN && tickersToUnsync.length > 0) {
    sendMessage(ws, { type: 'UNSUBSCRIBE', tickers: tickersToUnsync });
    tickersToUnsync.forEach((ticker) =>
      state.syncedSubscriptions.delete(ticker),
    );
  }
}
