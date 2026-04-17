import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import tickerRoutes from './api/routes/tickerRoutes';
import { SocketManager } from './api/websockets/SocketManager';
import { marketDataService } from './di';
import { connectRedis } from './infrastructure/redis/redisClient';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// REST Routes
app.use('/api/tickers', tickerRoutes);

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  try {
    await connectRedis();
    await marketDataService.initData();

    // Setup WebSocket Server after Redis is connected
    new SocketManager(server);

    server.listen(PORT, () => {
      console.log(`Backend Server is running on port ${PORT}`);
      
      // Start emitting mock stock data
      marketDataService.startSimulation();
      console.log('Market data simulation started with Redis.');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();