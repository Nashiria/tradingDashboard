import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress harmless ResizeObserver loop errors in the Webpack overlay
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();

    // Also try to hide webpack error overlay if it already popped up
    const overlay = document.getElementById(
      'webpack-dev-server-client-overlay',
    );
    if (overlay) {
      overlay.style.display = 'none';
      setTimeout(() => overlay.remove(), 0);
    }
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

reportWebVitals();
