import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { marketDataService } from '../../di';
import { redisSubscriber } from '../../infrastructure/redis/redisClient';

/**
 * Summary: Handles raw WebSocket connections to provide real-time ticker data streaming.
 * Class: SocketManager
 */
export class SocketManager {
  private wss: WebSocketServer;
  private clientSubscriptions: Map<WebSocket, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
  }

  /**
   * Summary: Configures event listeners mapping incoming standard WebSocket messages,
   * subscribing to the redis pub/sub architecture and mapping broadcasts to connected clients.
   * Method: SocketManager.init
   */
  private init() {
    this.wss.on('connection', async (ws: WebSocket) => {
      console.log('Client connected to real-time feed');
      this.clientSubscriptions.set(ws, new Set());

      // Send initial data immediately upon connection
      const initialTickers = await marketDataService.getTickers();
      ws.send(JSON.stringify({ 
        type: 'INITIAL_TICKERS', 
        data: initialTickers 
      }));

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG' }));
          } else if (parsed.type === 'SUBSCRIBE') {
            const subs = this.clientSubscriptions.get(ws);
            if (subs) {
              if (parsed.ticker) subs.add(parsed.ticker);
              if (Array.isArray(parsed.tickers)) {
                parsed.tickers.forEach((t: string) => subs.add(t));
              }
            }
          } else if (parsed.type === 'UNSUBSCRIBE') {
            const subs = this.clientSubscriptions.get(ws);
            if (subs) {
              if (parsed.ticker) subs.delete(parsed.ticker);
              if (Array.isArray(parsed.tickers)) {
                parsed.tickers.forEach((t: string) => subs.delete(t));
              }
            }
          }
        } catch (err) {
          // ignore parsing errors from clients
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected from real-time feed');
        this.clientSubscriptions.delete(ws);
      });
    });

    // Subscribe to Redis pub/sub instead of Node.js EventEmitter
    redisSubscriber.subscribe('priceUpdate', (message) => {
      try {
        const update = JSON.parse(message);
        if (update && update.symbol) {
          this.broadcastToSubscribers(update.symbol, {
            type: 'PRICE_UPDATE',
            data: update
          });
        }
      } catch (err) {
        console.error('Error parsing price update message from Redis:', err);
      }
    });
  }

  private broadcastToSubscribers(symbol: string, message: any) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        const subs = this.clientSubscriptions.get(client);
        if (subs && subs.has(symbol)) {
          client.send(payload);
        }
      }
    });
  }

  private broadcast(message: any) {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}
