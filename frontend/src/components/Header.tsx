import React from 'react';
import { BellRing, CircleUser, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useMarketData } from '../hooks/useMarketData';

interface HeaderProps {
  onRequestSignIn: (reason: string) => void;
  onDepositAction: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRequestSignIn,
  onDepositAction,
}) => {
  const { user, logout } = useAuth();
  const { isConnected, notifications } = useWebSocket();
  const { balance, totalDeposited, positions } = usePortfolio();
  const { tickers } = useMarketData();

  const marginUsed = positions.reduce((sum, pos) => sum + pos.margin, 0);

  let floatingPnl = 0;
  positions.forEach((pos) => {
    const ticker = tickers.find((t) => t.symbol === pos.symbol);
    if (ticker) {
      const currentPrice = ticker.currentPrice ?? ticker.basePrice;
      const isBuy = pos.side === 'buy';
      const pnl = isBuy
        ? (currentPrice - pos.openPrice) * pos.units
        : (pos.openPrice - currentPrice) * pos.units;
      floatingPnl += pnl;
    }
  });

  const currentEquity = balance + marginUsed + floatingPnl;
  const changePct =
    totalDeposited > 0
      ? ((currentEquity - totalDeposited) / totalDeposited) * 100
      : 0;

  return (
    <header className="top-header">
      <div className="header-brand-group">
        <div className="header-brand">
          MockBank<span className="header-brand-accent">.</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="header-deposit-button"
          type="button"
          onClick={() => {
            if (!user) {
              onRequestSignIn(
                'Sign in before adding funds or opening a position.',
              );
              return;
            }

            onDepositAction();
          }}
        >
          Deposit
        </button>

        <div className="header-equity-card">
          <span className="header-equity-label">Balance</span>
          <strong className="header-equity-value">
            {balance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </strong>
          <span className="header-equity-change"></span>
          <div
            className="header-margin-pill"
            title="Margin Call Risk Indicator"
            style={{ visibility: 'hidden' }}
          >
            Margin: 0
          </div>
        </div>

        <div className="header-equity-card">
          <span className="header-equity-label">Equity</span>
          <strong className="header-equity-value">
            {currentEquity.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            USD
          </strong>
          <span
            className="header-equity-change"
            style={{
              color:
                changePct >= 0 ? 'var(--text-success)' : 'var(--text-danger)',
            }}
          >
            {changePct >= 0 ? '+' : ''}
            {changePct.toFixed(2)}%
          </span>
          <div
            className="header-margin-pill"
            title="Margin Call Risk Indicator"
          >
            Margin:{' '}
            {marginUsed.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="header-pill-group">
          <span className="pill demo">Demo</span>
          <span className="pill standard">Standard</span>
          <span className="pill standard">Hedging</span>
          <span
            className={`pill ${isConnected ? 'pill-live' : 'pill-offline'}`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>

        <div className="header-profile-group">
          <div className="header-notification-pill">
            <BellRing size={14} /> {notifications.length}
          </div>
          <div className="header-user-copy">
            <strong>{user?.name ?? 'Guest'}</strong>
            <span>{user?.email ?? 'Browse markets, sign in to trade'}</span>
          </div>
          <span className="header-locale">EN</span>
          <CircleUser size={32} color="var(--text-secondary)" />
          {user ? (
            <button
              className="header-logout-button"
              type="button"
              onClick={logout}
            >
              <LogOut size={14} /> Logout
            </button>
          ) : (
            <button
              className="header-login-button"
              type="button"
              onClick={() =>
                onRequestSignIn(
                  'Sign in to save favorites, create alerts, and place trades.',
                )
              }
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
