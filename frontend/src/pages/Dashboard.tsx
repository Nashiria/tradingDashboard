import React, { useState, useEffect, useMemo } from 'react';
import { useTickerHistory } from '../hooks/useTickerHistory';
import { ChartComponent } from '../components/ChartComponent';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from '../components/Header';
import { LoginScreen } from '../components/LoginScreen';
import { Sidebar } from '../components/Sidebar';
import { SymbolList } from '../components/SymbolList';
import { OrderPanel } from '../components/OrderPanel';
import { Star, ChevronDown, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarketData } from '../context/MarketDataContext';
import { useWebSocket } from '../context/WebSocketContext';
import { usePortfolio } from '../context/PortfolioContext';
import { getSimulatedQuote } from '../helpers/pricing';
import { DashboardTab } from '../models/Ticker';
import {
  subscribeToTickers,
  unsubscribeFromTickers,
} from '../services/marketDataSocket';
import { Home } from './Home';
import { Funds } from './Funds';

type MobileWorkspacePanel = 'symbols' | 'chart' | 'order';

const MOBILE_WORKSPACE_PANELS: Array<{
  id: MobileWorkspacePanel;
  label: string;
}> = [
  { id: 'symbols', label: 'Markets' },
  { id: 'chart', label: 'Chart' },
  { id: 'order', label: 'Trade' },
];

export const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { ws, notifications, dismissNotification } = useWebSocket();
  const { tickers, isUsingFallbackData, toggleFavorite } = useMarketData();
  const { deposit } = usePortfolio();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EUR/USD');
  const [activeTab, setActiveTab] = useState<DashboardTab>('All');
  const [activeView, setActiveView] = useState<'Home' | 'Trade' | 'Funds'>(
    'Home',
  );
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobileWorkspacePanel>('chart');
  const [isIndicatorPanelOpen, setIsIndicatorPanelOpen] = useState(false);
  const {
    history,
    isLoading: isHistoryLoading,
    isUsingFallbackHistory,
    loadMoreHistory,
  } = useTickerHistory(selectedSymbol);

  const activeTicker = tickers.find((t) => t.symbol === selectedSymbol);
  const currentPrice =
    activeTicker?.currentPrice ?? activeTicker?.basePrice ?? 0;

  const visibleSymbolsString = useMemo(() => {
    return tickers
      .filter((t) => {
        if (activeTab === 'Favorites') return t.isFavorite;
        if (activeTab === 'Portfolio') return t.inPortfolio;
        if (activeTab === 'All') return true;
        return t.type === activeTab;
      })
      .map((t) => t.symbol)
      .sort()
      .join(',');
  }, [tickers, activeTab]);

  useEffect(() => {
    if (!ws) return;

    const visibleSymbols = visibleSymbolsString
      ? visibleSymbolsString.split(',')
      : [];
    const symbolsToSubscribe = Array.from(
      new Set([...visibleSymbols, selectedSymbol]),
    );

    subscribeToTickers(ws, symbolsToSubscribe);

    return () => {
      unsubscribeFromTickers(ws, symbolsToSubscribe);
    };
  }, [ws, visibleSymbolsString, selectedSymbol]);

  const { spreadPips, spreadAmount, bidPrice, askPrice } = useMemo(
    () => getSimulatedQuote(currentPrice),
    [currentPrice],
  );

  const chartInsights = useMemo(() => {
    if (history.length === 0) {
      return [
        { label: 'Session', value: '--' },
        { label: 'Range', value: '--' },
        { label: 'Ticks', value: '0' },
      ];
    }

    const prices = history.map((point) => point.price);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const sessionChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    const sessionRange = Math.max(...prices) - Math.min(...prices);

    return [
      {
        label: 'Session',
        value: `${sessionChange >= 0 ? '+' : ''}${sessionChange.toFixed(2)}%`,
      },
      { label: 'Range', value: sessionRange.toFixed(5) },
      { label: 'Ticks', value: history.length.toString() },
    ];
  }, [history]);

  useEffect(() => {
    setWorkspaceMessage(null);
  }, [selectedSymbol]);

  if (isLoading) {
    return <div className="dashboard-loading-shell">Loading workspace...</div>;
  }

  return (
    <div className="layout-container">
      <Header
        onRequestSignIn={setAuthPrompt}
        onDepositAction={(amount) => {
          deposit(amount);
          setWorkspaceMessage(
            `Demo balance credited with ${amount.toLocaleString()} USD for another round of paper trading.`,
          );
        }}
      />

      <div className="toast-stack">
        {notifications.map((notification) => (
          <div className="toast-card" key={notification.alert.id}>
            <div>
              <strong>{notification.alert.symbol} alert triggered</strong>
              <span>
                {notification.alert.direction === 'above'
                  ? 'Moved above'
                  : 'Moved below'}{' '}
                {notification.alert.targetPrice.toFixed(5)} at{' '}
                {notification.price.toFixed(5)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => dismissNotification(notification.alert.id)}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

      {(isUsingFallbackData || isUsingFallbackHistory) && (
        <div className="dashboard-mode-banner">
          Live backend is unavailable, so the workspace is showing local demo
          market data.
        </div>
      )}

      {workspaceMessage && (
        <div className="dashboard-workspace-banner">
          <span>{workspaceMessage}</span>
          <button type="button" onClick={() => setWorkspaceMessage(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div
        className="dashboard-mobile-switcher"
        role="tablist"
        aria-label="Workspace panels"
      >
        {MOBILE_WORKSPACE_PANELS.map((panel) => (
          <button
            key={panel.id}
            role="tab"
            aria-selected={mobilePanel === panel.id}
            type="button"
            className={`dashboard-mobile-switcher-button ${mobilePanel === panel.id ? 'active' : ''}`}
            onClick={() => setMobilePanel(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <main className={`main-content mobile-panel-${mobilePanel}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {activeView === 'Trade' ? (
          <>
            <SymbolList
              tickers={tickers}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={(symbol) => {
                setSelectedSymbol(symbol);
                setMobilePanel('chart');
              }}
              spreadAmount={spreadAmount}
              isAuthenticated={Boolean(user)}
              onRequireAuth={setAuthPrompt}
              onToggleFavorite={toggleFavorite}
            />

            <section className="chart-area">
              <div className="chart-toolbar">
                <button
                  type="button"
                  className="chart-toolbar-icon"
                  aria-label={`Toggle favorite for ${selectedSymbol}`}
                  aria-pressed={Boolean(activeTicker?.isFavorite)}
                  onClick={() => {
                    if (!user) {
                      setAuthPrompt(
                        `Sign in to manage favorites for ${selectedSymbol}.`,
                      );
                      return;
                    }

                    toggleFavorite(selectedSymbol);
                  }}
                >
                  <Star
                    size={20}
                    color={
                      activeTicker?.isFavorite
                        ? 'var(--accent-demo)'
                        : 'var(--text-muted)'
                    }
                    fill={
                      activeTicker?.isFavorite
                        ? 'var(--accent-demo)'
                        : 'transparent'
                    }
                  />
                </button>
                <div className="chart-toolbar-symbol">
                  <span className="text-h2">{selectedSymbol}</span>
                  <span className="text-caption text-up">LIVE</span>
                </div>
                <div className="chart-toolbar-timeframe">
                  <span className="text-price">5s</span>
                  <ChevronDown size={16} color="var(--text-muted)" />
                </div>
                <button
                  type="button"
                  className={`chart-toolbar-indicators ${isIndicatorPanelOpen ? 'active' : ''}`}
                  onClick={() => setIsIndicatorPanelOpen((current) => !current)}
                >
                  <Activity size={16} /> Insights
                </button>
              </div>

              {isIndicatorPanelOpen && (
                <div className="chart-indicator-panel">
                  {chartInsights.map((insight) => (
                    <div className="chart-indicator-stat" key={insight.label}>
                      <span>{insight.label}</span>
                      <strong>{insight.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="chart-main">
                <div className="chart-container">
                  {isHistoryLoading ? (
                    <div className="chart-loading">Loading chart data...</div>
                  ) : (
                    <div className="chart-wrapper">
                      <ErrorBoundary>
                        <ChartComponent
                          data={history}
                          symbol={selectedSymbol}
                          onLoadMore={loadMoreHistory}
                        />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <OrderPanel
              selectedSymbol={selectedSymbol}
              bidPrice={bidPrice}
              askPrice={askPrice}
              spreadPips={spreadPips}
              isAuthenticated={Boolean(user)}
              onRequireAuth={setAuthPrompt}
              onOrderSuccess={(msg) => setWorkspaceMessage(msg)}
            />
          </>
        ) : activeView === 'Home' ? (
          <Home
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              setActiveView('Trade');
              setMobilePanel('chart');
            }}
          />
        ) : (
          <Funds
            onDepositAction={(amount) => {
              deposit(amount);
              setWorkspaceMessage(
                `Demo balance credited with ${amount.toLocaleString()} USD for another round of paper trading.`,
              );
            }}
            onRequireAuth={setAuthPrompt}
          />
        )}
      </main>

      {authPrompt && (
        <div
          className="auth-modal-backdrop"
          role="presentation"
          onClick={() => setAuthPrompt(null)}
        >
          <div
            className="auth-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            onClick={(event) => event.stopPropagation()}
          >
            <LoginScreen
              title="Sign in when you want to trade"
              copy={authPrompt}
              submitLabel="Sign in"
              onClose={() => setAuthPrompt(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
