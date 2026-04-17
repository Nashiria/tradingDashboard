import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { marketDataService } from '../../business/services/MarketDataService';

export class SocketManager {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected to real-time feed');

      // Send initial data immediately upon connection
      ws.send(JSON.stringify({ 
        type: 'INITIAL_TICKERS', 
        data: marketDataService.getTickers() 
      }));

      ws.on('close', () => {
        console.log('Client disconnected from real-time feed');
      });
    });

    // Listen to our central market data service
    marketDataService.on('priceUpdate', (update) => {
      this.broadcast({
        type: 'PRICE_UPDATE',
        data: update
      });
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