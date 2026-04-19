import React from 'react';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { PortfolioProvider } from './context/PortfolioContext';
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <PortfolioProvider>
          <Dashboard />
        </PortfolioProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
