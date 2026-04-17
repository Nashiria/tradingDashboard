import React from 'react';
import { Dashboard } from './pages/Dashboard';
import { WebSocketProvider } from './context/WebSocketContext';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <Dashboard />
    </WebSocketProvider>
  );
}

export default App;
