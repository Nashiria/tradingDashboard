# Trading Dashboard - Backend

The backend service for the Real-Time Trading Dashboard. It is built with Node.js, Express, and TypeScript, utilizing Redis heavily for data persistence, historical caching, and real-time Pub/Sub communication.

## Tech Stack

* **Framework:** Express.js
* **Language:** TypeScript
* **WebSockets:** `ws` library
* **Database/Cache:** Redis
* **Architecture:** Layered Design (Controllers, Services, Repositories, Models)

## Key Features

* **REST API:** Serves current tickers and historical price data arrays.
* **WebSocket Server:** Broadcasts real-time price updates to connected clients based on topic subscriptions.
* **Market Data Simulation:** Automatically generates realistic market fluctuations (-0.3% to +0.3% per tick) and seeds up to 10 minutes of historical data on startup.
* **Redis Integration:** Utilizes Redis Hashes for key-value current prices, Redis Lists for shifting time-series history, and Redis Pub/Sub for scalable WebSocket broadcasting.

## API Documentation

### HTTP Endpoints

* `GET /api/tickers` - Retrieves the current list of all tracked market tickers, their metadata, and latest known prices.
* `GET /api/tickers/history?symbol=:symbol` - Retrieves the historical string of price data points for a specific ticker symbol (defaults to last 600 ticks).

### WebSocket Events (`/ws`)

The server accepts connections on `/ws` and supports bidirectional messaging:

**Client -> Server Commands:**
* **Subscribe:** `{"type": "SUBSCRIBE", "ticker": "BTC-USD"}` or `{"type": "SUBSCRIBE", "tickers": ["AAPL", "TSLA"]}`
* **Unsubscribe:** `{"type": "UNSUBSCRIBE", "ticker": "BTC-USD"}`
* **Ping/Pong:** `{"type": "PING"}` -> Server replies with `{"type": "PONG"}`

**Server -> Client Broadcasts:**
* `{"type": "INITIAL_TICKERS", "data": [...]}` (Sent immediately upon connection).
* `{"type": "PRICE_UPDATE", "data": {"symbol": "AAPL", "price": 175.55, "timestamp": 1709405900000}}` (Pushed to subscribed clients only).

## Running Locally

### Prerequisites
* Node.js
* Redis server running locally or via Docker (default assumes `redis://localhost:6379`)

### Setup

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Start the server (Make sure REDIS_URL is accessible)
npm start
```

### Development Mode

```bash
# Run the API with automatic reloads during development
npm run dev
```

### Docker Workflows

```bash
# Development containers with bind mounts and live reload
docker compose up --build

# Production-style containers with compiled assets
docker compose -f ../docker-compose.prod.yml up --build
```
