# Real-Time Trading Dashboard

## Project Overview

A full-stack real-time trading dashboard that simulates a live market data feed, displays interactive candlestick charts, and lets users manage price alerts — all streaming through WebSockets. The project is split into three workspace packages:

| Package         | Stack                                 | Purpose                                                                                                |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **`/backend`**  | Node.js, Express, TypeScript, `ws`    | Simulates market data, exposes REST APIs, broadcasts price updates via WebSocket, and manages alerts.  |
| **`/frontend`** | React, TypeScript, Lightweight Charts | Renders the trading workspace: symbol list, live candlestick chart, order panel, and alert management. |
| **`/shared`**   | TypeScript                            | Shared type definitions and runtime type guards used by both apps (`Ticker`, `PriceUpdate`, etc.).     |

### Architecture

```
┌────────────┐         ┌──────────────────────────────────────────────────┐
│            │  REST   │  Backend (Node.js / Express)                    │
│  Frontend  │◄───────►│                                                 │
│  (React)   │         │  Controllers ─► Services ─► Repositories       │
│            │  WS     │       │                          │              │
│            │◄───────►│  SocketManager             RedisClient          │
└────────────┘         └──────────────────┬───────────────┬─────────────┘
                                          │  Pub/Sub      │  Hash/List
                                     ┌────▼───────────────▼────┐
                                     │        Redis            │
                                     │  Prices · History ·     │
                                     │  Alerts · Pub/Sub       │
                                     └─────────────────────────┘
```

The backend follows a layered architecture:

- **`api/`** — Controllers, routes, middleware (auth, rate limiting, error handling), contracts (request/response shapes), and the WebSocket server.
- **`business/`** — Service layer containing domain logic (`MarketDataService`, `AuthService`, `AlertService`).
- **`domain/`** — Pure models (`Ticker`, `Alert`, `Auth`) and repository interfaces (`IMarketDataRepository`, `IAlertRepository`).
- **`infrastructure/`** — Concrete implementations (`RedisMarketDataRepository`, `RedisAlertRepository`, `redisClient`).
- **`di/`** — A lightweight typed dependency injection container with `DependencyToken<T>` symbols.

### Key Features

- **Real-Time Market Simulation** — Generates realistic ticks every second for 13 instruments across Forex, Crypto, Stocks, Metals, Indices, and Commodities, each with asset-class-specific volatility profiles.
- **Interactive Charting** — Raw tick data is aggregated into 5-second OHLC candlesticks and rendered with `lightweight-charts`.
- **Topic-Based WebSocket Subscriptions** — Clients subscribe/unsubscribe to individual tickers; the server only broadcasts updates for subscribed symbols, with replay of recent buffered updates on new subscriptions.
- **Standardized API** — Versioned JSON envelope (`{ version, data, meta }` / `{ version, error: { code, message, details } }`) with rate limiting, request logging, and structured validation errors.
- **Offline Fallback** — The frontend gracefully degrades to locally generated mock data when the backend is unreachable, with a visible banner explaining the mode.

---

## Assumptions & Trade-Offs

### Design Decisions

| Decision                                                  | Rationale                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redis as the sole data store**                          | Redis provides sub-millisecond reads for current prices (Hashes), bounded time-series storage (Lists trimmed to 600 entries), and cross-instance event fanout (Pub/Sub) — all in a single dependency. A traditional database was not needed for simulated demo data.                    |
| **Custom mock auth instead of a real identity provider**  | The auth layer uses HMAC-SHA256 signed tokens with `crypto.timingSafeEqual` validation, 12-hour TTL, and Bearer token middleware. This is enough to demonstrate protected routes, per-user WebSocket notifications, and session management without adding OAuth/JWT library complexity. |
| **No third-party DI framework**                           | A hand-rolled `DependencyContainer` with typed tokens (~36 lines) avoids heavy runtime dependencies like InversifyJS while still providing singleton resolution, factory registration, and full override support for testing.                                                           |
| **`lightweight-charts` over Recharts for the main chart** | Recharts is included as a dependency but the active chart uses `lightweight-charts` for its native financial charting support (candlesticks, crosshair, autoscaling). Recharts was initially evaluated but `lightweight-charts` proved more suitable for real-time OHLC rendering.      |
| **Frontend reference-counted subscriptions**              | A `WeakMap<WebSocket, SocketSubscriptionState>` tracks desired vs. synced subscriptions with reference counting so multiple React hooks can subscribe to the same ticker without sending duplicate SUBSCRIBE messages to the server.                                                    |

### Trade-Offs

- **Equity and margin values are static.** The order panel displays hardcoded "10,000.00 USD" and calculated margin values. A real implementation would require a portfolio/account service, which was outside the scope of this challenge.
- **Drawing tools are visual-only.** The chart toolbar renders Crosshair, Cursor, Trend, and Sketch tool buttons that update a label, but do not draw on the chart canvas. These were included as UI placeholders to match the layout of a professional trading terminal.
- **The `redisClient` module is a singleton rather than DI-injected.** Repository implementations import the Redis client directly for pragmatic simplicity. In a larger production system, the client instances would be injected through the container to fully decouple infrastructure from domain code.
- **Price history is bounded to 600 points (~10 minutes at 1 tick/sec).** This keeps Redis memory usage predictable and avoids unbounded growth, but means the frontend chart only shows a trailing 10-minute window.
- **CORS defaults to a single frontend origin.** The backend uses `FRONTEND_ORIGIN` (default `http://localhost:3000`) rather than allowing every origin, but production deployments would still want environment-specific hardening.

---

## Running the Project

### Prerequisites

- **Docker and Docker Compose** (recommended — runs everything with a single command)
- **Node.js 18+** (for local development without Docker)

### Quick Start with Docker

```bash
# Copy the example environment file
cp .env.example .env

# Start all services (Redis, backend, frontend) in development mode
docker compose up --build
```

| Service           | URL                               |
| ----------------- | --------------------------------- |
| Frontend          | http://localhost:3000             |
| Backend REST API  | http://localhost:8080/api/tickers |
| Backend WebSocket | ws://localhost:8080/ws            |

### Production-Style Build

Compiles the backend TypeScript and serves the frontend as static files through Nginx:

```bash
docker compose -f docker-compose.prod.yml up --build
```

### Local Development (Without Docker)

Requires a Redis server running at `redis://localhost:6379` (or set `REDIS_URL`):

```bash
# Install all workspace dependencies
npm install

# Start the backend with hot-reload
npm --prefix backend run dev

# In another terminal, start the frontend dev server
npm --prefix frontend start
```

---

## Running Tests

### All Tests (Backend + Frontend)

```bash
npm test
```

This runs:

1. **Backend tests** via Node's built-in `node:test` runner (`node --test test/*.test.ts`)
2. **Frontend tests** via Jest + React Testing Library (`react-scripts test --watchAll=false`)

### Backend Tests Only

```bash
npm --prefix backend test
```

**13 test files** covering:

| Test File                             | What It Covers                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `marketSimulation.test.ts`            | Variance profile lookups and bounded random walk generation                                   |
| `marketDataService.test.ts`           | History filtering/limiting, ticker lookup, catalog injection                                  |
| `authService.test.ts`                 | Login, case-insensitive email, token verification, tampering rejection, expiration            |
| `alertService.test.ts`                | Alert creation (price rounding), listing order, trigger evaluation, idempotent re-trigger     |
| `tickerController.test.ts`            | Response envelope shape, query validation, symbol normalization, 404 handling                 |
| `authController.test.ts`              | Login flow, credential validation                                                             |
| `alertController.test.ts`             | CRUD operations, auth gating, input validation                                                |
| `socketManager.test.ts`               | Initial data broadcast, PING/PONG, subscribe/replay buffered updates, unsubscribe filtering   |
| `redisMarketDataRepository.test.ts`   | Redis command delegation, history persistence/trimming, invalid entry filtering               |
| `rateLimiter.test.ts`                 | Window-based rate limiting, header injection, 429 responses                                   |
| `tickerContracts.test.ts`             | Symbol regex validation, query parameter parsing, range validation                            |
| `di.test.ts`                          | Singleton resolution, dependency override support                                             |
| `authAlertRoutes.integration.test.ts` | **Full HTTP integration:** boots Express, exercises login → create alert → list → delete flow |

> **Note:** Backend tests use in-memory repository stubs and mock Redis client methods — no running Redis instance is required for testing.

### Frontend Tests Only

```bash
CI=true npm --prefix frontend test -- --watchAll=false
```

Frontend test coverage includes:

| Test File                   | What It Covers                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `App.test.tsx`              | Full dashboard rendering, ticker switching, tab filtering, subscription calls, guest vs. authenticated behavior |
| `useMarketData.test.ts`     | Price update batching (100ms debounce), fallback to local demo data                                             |
| `useTickerHistory.test.ts`  | History fetch, live update appending                                                                            |
| `WebSocketContext.test.tsx` | Connection lifecycle, heartbeat scheduling, reconnection with exponential backoff, max retry limit              |
| `marketDataSocket.test.ts`  | Message parsing                                                                                                 |
| `pricing.test.ts`           | Simulated bid/ask spread calculation                                                                            |

### Linting

```bash
npm run lint          # ESLint (backend + frontend)
npm run format:check  # Prettier check
npm run format        # Prettier auto-fix
```

---

## Bonus Features

### ✅ Mocked Authentication

- **HMAC-SHA256 signed tokens** created in `AuthService` with `crypto.timingSafeEqual` for constant-time signature comparison and 12-hour TTL.
- **Two demo accounts:** `demo@mockbank.com` / `demo123` and `trader@mockbank.com` / `trader123`.
- **Bearer token middleware** (`requireAuth`) protects alert routes and the `/api/auth/me` endpoint.
- **WebSocket user identification:** The server resolves the user from the authenticated session cookie during the WebSocket handshake, so alert-triggered notifications are delivered only to the owning user's sockets.
- **Session persistence:** Authentication is stored in an `httpOnly` cookie and validated against the backend on page load via `GET /api/auth/me`. The frontend reconnects the socket when auth state changes so cookie-backed alerts stay in sync.

### ✅ Caching (Redis)

- **Current prices:** Stored in a Redis Hash (`prices`) for O(1) lookups.
- **Historical data:** Stored in per-symbol Redis Lists (`history:{symbol}`), trimmed to the latest 600 entries on every write. Serves as the backing store for the `GET /api/tickers/history` endpoint.
- **Startup seeding:** On first boot (when Redis is empty), `MarketDataService.initData()` generates 600 historical ticks per symbol (10 minutes of simulated history) so the chart has data before live ticks arrive.
- **Pub/Sub:** `priceUpdate` and `alertTriggered` channels enable broadcasting across potentially multiple Node.js instances.

### ✅ Price Alerts

- **Full CRUD:** `POST /api/alerts` (create), `GET /api/alerts` (list), `DELETE /api/alerts/:alertId` (delete) — all protected by authentication.
- **Real-time evaluation:** `AlertService.processPriceUpdate()` is called on every simulation tick; when a price crosses a threshold, the alert is marked as triggered and a notification is published via Redis Pub/Sub.
- **WebSocket delivery:** `SocketManager` listens on the `alertTriggered` channel and forwards events only to WebSocket connections belonging to the alert's owner.
- **Frontend UI:** The `AlertPanel` component shows quick-action buttons ("Above market" / "Below market"), a direction/target form, active alert list with status badges, and delete buttons. Triggered alerts appear as dismissible toast notifications.

### ✅ Kubernetes Manifests

Located in `k8s/`, deployable with Kustomize:

```bash
kubectl apply -k k8s
```

Includes:

- **Namespace** (`trading-dashboard`)
- **ConfigMap** (shared environment variables)
- **Redis** Deployment + Service with a PersistentVolumeClaim
- **Backend** Deployment (2 replicas) + Service with readiness/liveness probes on `/health`
- **Frontend** Deployment + Service
- **Ingress** with path-based routing (`/` → frontend, `/api` → backend, `/ws` → backend)
- **Secret example** (`backend-secret.example.yaml`) for `AUTH_SECRET`

### Additional Polish

- **Rate limiting** per endpoint scope (auth: 10/min, tickers: 120/10s, alerts: 60/min) with `X-RateLimit-*` and `Retry-After` headers.
- **Health endpoint** (`GET /health`) that reports Redis connectivity status.
- **Request logging middleware** with method, path, status code, duration, and client IP.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) that validates Docker Compose configs and builds production images.
- **Husky + lint-staged** pre-commit hooks for Prettier and ESLint auto-fixing.
- **Graceful offline mode** — the frontend detects when the backend is unreachable and switches to locally simulated market data with a visible banner.

---

## Environment Variables

See `.env.example` for all available variables:

| Variable            | Default                  | Description                                  |
| ------------------- | ------------------------ | -------------------------------------------- |
| `BACKEND_PORT`      | `8080`                   | Host port for the backend service            |
| `FRONTEND_PORT`     | `3000`                   | Host port for the frontend service           |
| `REDIS_PORT`        | `6379`                   | Host port for the Redis service              |
| `PORT`              | `8080`                   | Internal backend server port                 |
| `REDIS_URL`         | `redis://redis:6379`     | Redis connection URL                         |
| `FRONTEND_ORIGIN`   | `http://localhost:3000`  | Allowed browser origin for CORS and cookies  |
| `REACT_APP_API_URL` | `http://localhost:8080`  | Backend REST base URL (used by the frontend) |
| `REACT_APP_WS_URL`  | `ws://localhost:8080/ws` | Backend WebSocket URL (used by the frontend) |
