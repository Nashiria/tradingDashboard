import { IncomingMessage, Server } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { AuthService } from '../../business/services/AuthService';
import { MarketDataReadPort } from '../../business/services/MarketDataService';
import {
  AlertTriggeredMessage,
  ErrorMessage,
  InitialTickersMessage,
  PriceUpdateMessage,
  ServerMessage,
  parseAlertTriggeredMessage,
  parseClientMessage,
  parsePriceUpdateMessage,
} from './messages';
import { parseCookies } from '../contracts/requestCookies';
import { AUTH_TOKEN_COOKIE_NAME } from '../../config/auth';

type PriceUpdateSubscriber = {
  subscribe(
    channel: string,
    listener: (message: string) => void,
  ): Promise<unknown> | unknown;
};

type ClientWebSocket = WebSocket & {
  isAlive?: boolean;
  userId?: string;
};

const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_BUFFERED_UPDATES_PER_SYMBOL = 120;
const PRICE_UPDATE_RETENTION_MS = 5 * 60 * 1000;

/**
 * Coordinates websocket clients, ticker subscriptions, and Redis fan-out.
 */
export class SocketManager {
  private wss: WebSocketServer;
  private started = false;
  private clientSubscriptions: Map<WebSocket, Set<string>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    server: Server,
    private readonly marketDataService: Pick<
      MarketDataReadPort,
      'getTickers' | 'hasTicker' | 'getHistory'
    >,
    private readonly priceUpdateSubscriber: PriceUpdateSubscriber,
    private readonly authService?: AuthService,
  ) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
  }

  /**
   * Boots the websocket server once and wires heartbeat, connection, and pub/sub listeners.
   */
  public start() {
    if (this.started) {
      return;
    }

    this.started = true;

    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const socket = client as ClientWebSocket;

        if (socket.isAlive === false) {
          this.cleanupClient(socket);
          socket.terminate();
          return;
        }

        socket.isAlive = false;
        socket.ping();
      });
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatInterval.unref?.();

    this.wss.on('close', () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
    });

    this.wss.on(
      'connection',
      async (ws: WebSocket, request: IncomingMessage) => {
        const socket = ws as ClientWebSocket;
        console.log('Client connected to real-time feed');
        socket.isAlive = true;
        socket.userId = this.resolveUserId(request);
        this.clientSubscriptions.set(socket, new Set());

        socket.on('pong', () => {
          socket.isAlive = true;
        });

        const initialTickers = await this.marketDataService.getTickers();
        const initialMessage: InitialTickersMessage = {
          type: 'INITIAL_TICKERS',
          data: initialTickers,
        };
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(initialMessage));
        }

        socket.on('message', (message: RawData) => {
          const parsed = parseClientMessage(message.toString());
          if (!parsed) {
            return;
          }

          if (parsed.type === 'PING') {
            socket.send(
              JSON.stringify({ type: 'PONG' } satisfies ServerMessage),
            );
            return;
          }

          const subscriptions = this.clientSubscriptions.get(socket);
          if (!subscriptions) {
            return;
          }

          const requestedTickers = [
            ...(parsed.ticker ? [parsed.ticker] : []),
            ...(parsed.tickers ?? []),
          ];

          if (parsed.type === 'SUBSCRIBE') {
            const validTickers: string[] = [];
            const invalidTickers: string[] = [];
            const newlySubscribedTickers: string[] = [];

            requestedTickers.forEach((ticker) => {
              if (this.marketDataService.hasTicker(ticker)) {
                validTickers.push(ticker);
              } else {
                invalidTickers.push(ticker);
              }
            });

            validTickers.forEach((ticker) => {
              if (!subscriptions.has(ticker)) {
                newlySubscribedTickers.push(ticker);
              }

              subscriptions.add(ticker);
            });

            void this.sendBufferedUpdates(socket, newlySubscribedTickers).catch(
              (error) => {
                console.error(
                  'Failed to replay buffered websocket updates',
                  error,
                );
              },
            );

            if (invalidTickers.length > 0) {
              const errorMessage: ErrorMessage = {
                type: 'ERROR',
                message: 'One or more requested tickers are unavailable.',
                invalidTickers,
              };
              socket.send(JSON.stringify(errorMessage));
            }

            return;
          }

          requestedTickers.forEach((ticker) => subscriptions.delete(ticker));
        });

        socket.on('close', () => {
          console.log('Client disconnected from real-time feed');
          this.cleanupClient(socket);
        });
      },
    );

    this.priceUpdateSubscriber.subscribe('priceUpdate', (message) => {
      const update = parsePriceUpdateMessage(message);
      if (!update) {
        console.error('Error parsing price update message from Redis');
        return;
      }

      const payload: PriceUpdateMessage = {
        type: 'PRICE_UPDATE',
        data: update,
      };

      this.broadcastToSubscribers(update.symbol, payload);
    });

    this.priceUpdateSubscriber.subscribe('alertTriggered', (message) => {
      const event = parseAlertTriggeredMessage(message);
      if (!event) {
        console.error('Error parsing alert triggered message from Redis');
        return;
      }

      const payload: AlertTriggeredMessage = {
        type: 'ALERT_TRIGGERED',
        data: event,
      };

      this.broadcastToUser(event.userId, payload);
    });
  }

  private broadcastToSubscribers(symbol: string, message: ServerMessage) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const subscriptions = this.clientSubscriptions.get(client);
        if (subscriptions?.has(symbol)) {
          client.send(payload);
        }
      }
    });
  }

  private cleanupClient(ws: WebSocket) {
    this.clientSubscriptions.delete(ws);
  }

  private async sendBufferedUpdates(socket: WebSocket, tickers: string[]) {
    if (socket.readyState !== WebSocket.OPEN || tickers.length === 0) {
      return;
    }

    const retentionThreshold = Date.now() - PRICE_UPDATE_RETENTION_MS;

    for (const ticker of tickers) {
      const updates = await this.marketDataService.getHistory(ticker, {
        from: retentionThreshold,
        limit: MAX_BUFFERED_UPDATES_PER_SYMBOL,
      });

      updates.forEach((update) => {
        const payload: PriceUpdateMessage = {
          type: 'PRICE_UPDATE',
          data: update,
        };

        socket.send(JSON.stringify(payload));
      });
    }
  }

  private resolveUserId(request: IncomingMessage): string | undefined {
    if (!this.authService || !request.url) {
      return undefined;
    }

    let token: string | null = null;
    const url = new URL(request.url, 'ws://localhost');
    token = url.searchParams.get('token');

    if (!token && request.headers.cookie) {
      const cookies = parseCookies(request.headers.cookie);
      token = cookies[AUTH_TOKEN_COOKIE_NAME] || null;
    }

    if (!token) {
      return undefined;
    }

    return this.authService.verifyToken(token)?.id;
  }

  private broadcastToUser(userId: string, message: ServerMessage) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      const socket = client as ClientWebSocket;
      if (socket.readyState === WebSocket.OPEN && socket.userId === userId) {
        socket.send(payload);
      }
    });
  }
}
