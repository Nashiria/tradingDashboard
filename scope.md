# Objective
Design and implement a real-time trading dashboard that displays live ticker prices and interactive charts for selected financial instruments.
# Scope
1. Backend Service (Java/NodeJS/Go)
Build a microservice that:
* Simulates or connects to a mock market data feed (e.g., WebSocket or polling)
* Streams real-time price updates for a set of tickers (e.g., AAPL, TSLA, BTC-USD)
* Exposes a RESTful API to:
* List available tickers
* Fetch historical price data (mocked)
* Subscribe to real-time updates via WebSocket

2. Frontend Dashboard (React + TypeScript)
Create a dashboard UI that:
* Displays a list of tickers with live price updates
* Shows a real-time chart for a selected ticker (e.g., using Chart.js or Recharts)
* Allows users to switch between tickers
* Includes basic styling and responsiveness

3. Architecture & Design
* Use a microservices-friendly structure
* Apply clean code principles and separation of concerns
* Include basic unit tests for backend logic
* Use Docker for containerization

4. Bonus Features (Optional)
* Add user authentication (mocked)
* Implement caching for historical data
* Add alerting for price thresholds
* Deploy using Kubernetes manifests

# Evaluation Criteria
* Code quality and structure
* Real-time data handling
* API and WebSocket implementation
* UI responsiveness and interactivity
* Test coverage and documentation
* Bonus features and overall polish
