# Real-Time Trading Dashboard - Frontend

This is the frontend application for the Real-Time Trading Dashboard. It connects to the backend service via REST APIs and WebSockets to display live market data and interactive charts.

## Tech Stack
* **Framework:** React
* **Language:** TypeScript
* **Charting:** Recharts
* **Network:** Fetch/Axios (REST API), Native WebSocket API

## Features
* **Live Ticker List:** Displays a real-time list of available financial instruments (e.g., AAPL, BTC-USD) with their current prices.
* **Interactive Charts:** Visualizes the price history of a selected ticker over time using an interactive line chart.
* **WebSocket Integration:** Receives simulated market movements in real-time with millisecond latency.
* **Responsive Design:** A clean UI that adapts to different screen sizes.

## Project Structure
The source code (`src/`) is organized into the following directories based on separation of concerns:
* `components/`: Reusable, presentation-focused UI elements (e.g., TickerItem, Chart).
* `helpers/`: Utility functions such as currency formatting or date parsing.
* `hooks/`: Custom React hooks for encapsulating stateful logic (e.g., `useWebSocket`, `useMarketData`).
* `models/`: TypeScript interfaces and type definitions defining the domain.
* `pages/`: Container components representing whole views or routes (e.g., `Dashboard`).
* `services/`: The API layer responsible for HTTP requests to the backend.
* `styles/`: Global CSS/SCSS files and theme configurations.

## Setup & Running Locally

### Prerequisites
1. Ensure you have Node.js installed.
2. The **backend service** must be running simultaneously (typically on `http://localhost:8080` and `ws://localhost:8080/ws`).

### Installation
1. Open a terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Development
To start the React development server:
```bash
npm start
```
The application will open automatically in your default browser at [http://localhost:3000](http://localhost:3000). Any changes to the code will hot-reload the page.

### Build
To build the app for production to the `build` folder:
```bash
npm run build
```
It correctly bundles React in production mode and optimizes the build for the best performance.