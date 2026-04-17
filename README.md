# Real-Time Trading Dashboard

A comprehensive full-stack application demonstrating a real-time trading dashboard with live market data, historical charts, and caching. The project is split into a React frontend and a Node.js/Express backend, backed by Redis for high-performance data storage and Pub/Sub mechanics.

## Architecture

* **Frontend:** React, TypeScript, Native WebSocket API, interactive charting.
* **Backend:** Node.js, Express, TypeScript, `ws` (WebSockets).
* **Database/Cache/Messaging:** Redis (used for caching historical timeframe data, storing current prices, and real-time Pub/Sub).
* **Deployment:** Docker & Docker Compose.

## Project Structure

* `/frontend`: React application that consumes REST APIs and subscribes to WebSocket events for real-time price updates.
* `/backend`: Node.js server that generates simulated market data, serves REST endpoints, and broadcasts updates via WebSockets using Redis Pub/Sub.

## Getting Started

### Prerequisites

* Docker and Docker Compose
* Node.js (for local development)

### Running with Docker

You can spin up the entire stack (Frontend, Backend, and Redis) using Docker Compose:

```bash
docker-compose up --build
```

* **Frontend** will be available at: http://localhost:3000
* **Backend REST API** will be available at: http://localhost:8080/api/tickers
* **Backend WebSocket** will be available at: ws://localhost:8080/ws

## Key Features

* **Real-time Market Simulation:** Simulates realistic ticks for Forex, Crypto, Stocks, Indices, and Commodities.
* **Scalable Messaging:** Uses Redis Pub/Sub so multiple Node.js instances could seamlessly broadcast updates.
* **Historical Persistence:** Stores the last 10 minutes of trailing data per ticker strictly through Redis Lists.
* **Fully Typed:** End-to-end TypeScript usage for robust models and interfaces across both apps.