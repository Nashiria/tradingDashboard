import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { createRateLimiter } from './api/middleware/rateLimiter';
import { requestLogger } from './api/middleware/requestLogger';
import { createAlertRoutes } from './api/routes/alertRoutes';
import { createAuthRoutes } from './api/routes/authRoutes';
import { createTickerRoutes } from './api/routes/tickerRoutes';
import { SocketManager } from './api/websockets/SocketManager';
import { createApplicationContext } from './di';
import {
  connectRedis,
  redisClient,
  redisSubscriber,
} from './infrastructure/redis/redisClient';

dotenv.config();

const app = express();
const server = http.createServer(app);
const applicationContext = createApplicationContext();
const authRateLimiter = createRateLimiter({
  scope: 'auth',
  windowMs: 60_000,
  maxRequests: 10,
});
const tickerRateLimiter = createRateLimiter({
  scope: 'tickers',
  windowMs: 10_000,
  maxRequests: 120,
});
const alertRateLimiter = createRateLimiter({
  scope: 'alerts',
  windowMs: 60_000,
  maxRequests: 60,
});

// Middleware
app.use(
  cors({
    origin: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  const redisReady = redisClient.isReady && redisSubscriber.isReady;

  res.status(redisReady ? 200 : 503).json({
    status: redisReady ? 'ok' : 'degraded',
    services: {
      redis: redisReady ? 'up' : 'down',
    },
  });
});

// REST Routes
app.use(
  '/api/auth',
  authRateLimiter,
  createAuthRoutes(
    applicationContext.authController,
    applicationContext.authService,
  ),
);
app.use(
  '/api/tickers',
  tickerRateLimiter,
  createTickerRoutes(applicationContext.tickerController),
);
app.use(
  '/api/alerts',
  alertRateLimiter,
  createAlertRoutes(
    applicationContext.alertController,
    applicationContext.authService,
  ),
);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  try {
    await connectRedis();
    await applicationContext.marketDataService.initData();

    // Setup WebSocket Server after Redis is connected
    const socketManager = new SocketManager(
      server,
      applicationContext.marketDataService,
      redisSubscriber,
      applicationContext.authService,
    );
    socketManager.start();

    server.listen(PORT, () => {
      console.log(`Backend Server is running on port ${PORT}`);

      // Start emitting mock stock data
      applicationContext.marketDataService.startSimulation();
      console.log('Market data simulation started with Redis.');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
