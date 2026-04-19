import React from 'react';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { MarketDataProvider } from './context/MarketDataContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/App.css';

function App() {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', color: 'red' }}>
          A critical error occurred. Please refresh the page.
        </div>
      }
    >
      <AuthProvider>
        <WebSocketProvider>
          <MarketDataProvider>
            <PortfolioProvider>
              <Dashboard />
            </PortfolioProvider>
          </MarketDataProvider>
        </WebSocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
