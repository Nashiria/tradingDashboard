import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import tickerRoutes from './api/routes/tickerRoutes';
import { SocketManager } from './api/websockets/SocketManager';
import { marketDataService } from './business/services/MarketDataService';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// REST Routes
app.use('/api/tickers', tickerRoutes);

// Setup WebSocket Server
new SocketManager(server);

// Start Server
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Backend Server is running on port ${PORT}`);
  
  // Start emitting mock stock data
  marketDataService.startSimulation();
  console.log('Market data simulation started.');
});