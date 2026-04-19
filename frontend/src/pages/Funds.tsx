import React from 'react';
import { ArrowUpRight, Landmark, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';
import '../styles/Funds.css';

interface FundsProps {
  onDepositAction: (amount: number) => void;
  onRequireAuth: (reason: string) => void;
}

const DEPOSIT_PRESETS = [1000, 5000, 10000] as const;

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const Funds: React.FC<FundsProps> = ({
  onDepositAction,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const { balance, totalDeposited, positions } = usePortfolio();
  const { equity, freeMargin, floatingPnl, marginUsed } = usePortfolioMetrics();

  const handleDeposit = (amount: number) => {
    if (!user) {
      onRequireAuth('Sign in before adding funds to the demo account.');
      return;
    }

    onDepositAction(amount);
  };

  return (
    <section className="funds-page">
      <div className="funds-hero">
        <div>
          <span className="funds-eyebrow">Account funding</span>
          <h1>Manage demo capital without leaving the terminal.</h1>
          <p>
            Deposit preset amounts, review available buying power, and keep an
            eye on open-position exposure from one place.
          </p>
        </div>
        <div className="funds-hero-pill">
          <WalletCards size={18} />
          {user ? 'Funding enabled' : 'Sign in to fund the account'}
        </div>
      </div>

      <div className="funds-grid">
        <div className="funds-card">
          <div className="funds-card-header">
            <Landmark size={18} />
            <span>Quick deposit</span>
          </div>
          <div className="funds-deposit-actions">
            {DEPOSIT_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="funds-deposit-button"
                onClick={() => handleDeposit(amount)}
              >
                + {amount.toLocaleString()} USD
              </button>
            ))}
          </div>
          <p className="funds-card-copy">
            Deposits adjust demo buying power instantly and keep the trading
            workspace in sync.
          </p>
        </div>

        <div className="funds-card">
          <div className="funds-card-header">
            <ArrowUpRight size={18} />
            <span>Account snapshot</span>
          </div>
          <div className="funds-stat-list">
            <div className="funds-stat-row">
              <span>Balance</span>
              <strong>{formatUsd(balance)} USD</strong>
            </div>
            <div className="funds-stat-row">
              <span>Deposited</span>
              <strong>{formatUsd(totalDeposited)} USD</strong>
            </div>
            <div className="funds-stat-row">
              <span>Equity</span>
              <strong>{formatUsd(equity)} USD</strong>
            </div>
            <div className="funds-stat-row">
              <span>Free margin</span>
              <strong>{formatUsd(freeMargin)} USD</strong>
            </div>
            <div className="funds-stat-row">
              <span>Margin used</span>
              <strong>{formatUsd(marginUsed)} USD</strong>
            </div>
            <div className="funds-stat-row">
              <span>Open P&amp;L</span>
              <strong
                className={
                  floatingPnl >= 0
                    ? 'funds-stat-positive'
                    : 'funds-stat-negative'
                }
              >
                {floatingPnl >= 0 ? '+' : ''}
                {formatUsd(floatingPnl)} USD
              </strong>
            </div>
          </div>
          <p className="funds-card-copy">
            {positions.length === 0
              ? 'No open positions are currently consuming margin.'
              : `${positions.length} open position${positions.length === 1 ? '' : 's'} are currently using account margin.`}
          </p>
        </div>
      </div>
    </section>
  );
};
