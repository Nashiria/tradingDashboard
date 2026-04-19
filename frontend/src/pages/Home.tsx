import React, { useMemo, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { useMarketData } from '../hooks/useMarketData';
import { Eye, EyeOff, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { TickerWithPrice } from '../models/Ticker';
import '../styles/Home.css';

interface HomeProps {
  onSelectSymbol: (symbol: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectSymbol }) => {
  const { balance, positions } = usePortfolio();
  const { tickers } = useMarketData();
  const [showValues, setShowValues] = useState(true);

  // Mocking Equity and PNL for Home screen
  const totalMargin = useMemo(
    () => positions.reduce((acc, p) => acc + p.margin, 0),
    [positions],
  );

  // A naive mock for current PNL calculation (requires live prices)
  const currentPnl = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const ticker = tickers.find((t) => t.symbol === pos.symbol);
      const currentPrice =
        ticker?.currentPrice ?? ticker?.basePrice ?? pos.openPrice;
      const pnl =
        pos.side === 'buy'
          ? (currentPrice - pos.openPrice) * pos.units
          : (pos.openPrice - currentPrice) * pos.units;
      return acc + pnl;
    }, 0);
  }, [positions, tickers]);

  // Balance already has margin deducted in PortfolioContext
  const equity = balance + totalMargin + currentPnl;
  const freeMargin = equity - totalMargin;
  const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : 0;

  const displayValue = (val: number, format = 'currency') => {
    if (!showValues) return '••••';
    if (format === 'percent') return `${val.toFixed(2)}%`;
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      })
        .format(val)
        .replace('$', '') + ' USD'
    );
  };

  const getPnlClass = (val: number) => {
    if (val > 0) return 'positive';
    if (val < 0) return 'negative';
    return 'neutral';
  };

  // Extract Top Gainers and Losers
  const { gainers, losers, popular } = useMemo(() => {
    const sorted = [...tickers].sort((a, b) => {
      const aCurrent = a.currentPrice ?? a.basePrice;
      const bCurrent = b.currentPrice ?? b.basePrice;
      const aChange = (aCurrent - a.basePrice) / a.basePrice;
      const bChange = (bCurrent - b.basePrice) / b.basePrice;
      return bChange - aChange;
    });

    const gainers = sorted.slice(0, 5);
    const losers = [...sorted].reverse().slice(0, 5);
    const popular = tickers
      .filter((t) => t.isFavorite || t.type === 'Crypto' || t.type === 'Forex')
      .slice(0, 7);

    return { gainers, losers, popular };
  }, [tickers]);

  const getChangePercent = (t: TickerWithPrice) => {
    const current = t.currentPrice ?? t.basePrice;
    if (!current || !t.basePrice) return 0;
    return ((current - t.basePrice) / t.basePrice) * 100;
  };

  const maxGainerPct =
    gainers.length > 0 ? Math.max(getChangePercent(gainers[0]), 0.01) : 1;
  const maxLoserPct =
    losers.length > 0
      ? Math.max(Math.abs(getChangePercent(losers[0])), 0.01)
      : 1;

  const renderAssetIcon = (asset: TickerWithPrice) => {
    if (!asset.icon) {
      return (
        <div className="asset-icon-fallback">
          {asset.symbol.substring(0, 2)}
        </div>
      );
    }

    if (asset.icon.includes('|')) {
      const [primary, secondary] = asset.icon.split('|');
      return (
        <div className="home-pair-icon">
          <img
            src={primary}
            alt=""
            className="home-pair-icon-primary"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <img
            src={secondary}
            alt=""
            className="home-pair-icon-secondary"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    return (
      <img
        src={asset.icon}
        alt={asset.symbol}
        className="home-single-icon"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  };

  return (
    <div className="home-dashboard">
      <div className="home-equity-card">
        <div className="equity-header">
          <span className="equity-value">{displayValue(equity)}</span>
          <button
            className="eye-btn"
            onClick={() => setShowValues(!showValues)}
            aria-label="Toggle values visibility"
          >
            {showValues ? <Eye size={24} /> : <EyeOff size={24} />}
          </button>
        </div>

        <div className="equity-stats">
          <div className="stat-cell">
            <span className="stat-label">Available Balance</span>
            <span className="stat-value">{displayValue(balance)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">P&L</span>
            <div className={`pnl-badge ${getPnlClass(currentPnl)}`}>
              <div className={`dot ${getPnlClass(currentPnl)}`} />
              {showValues ? (
                <span>
                  {currentPnl > 0 ? '+' : ''}
                  {currentPnl.toFixed(2)} USD
                </span>
              ) : (
                '••••'
              )}
            </div>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Margin</span>
            <span className="stat-value">{displayValue(totalMargin)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Margin Level</span>
            <span className="stat-value">
              {marginLevel > 0 ? displayValue(marginLevel, 'percent') : '--'}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Free Margin</span>
            <span className="stat-value">{displayValue(freeMargin)}</span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        {/* Top Gainers */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h2>Top Gainers</h2>
            <TrendingUp color="#1FC17B" size={24} />
          </div>
          <div className="bar-charts">
            {gainers.map((g, i) => {
              const pct = getChangePercent(g);
              const height = Math.max((pct / maxGainerPct) * 100, 4);
              return (
                <div
                  key={g.symbol}
                  className="bar-column"
                  onClick={() => onSelectSymbol(g.symbol)}
                  style={{ cursor: 'pointer' }}
                  title={`Trade ${g.symbol}`}
                >
                  <span className="bar-percentage" style={{ color: '#1FC17B' }}>
                    +{pct.toFixed(2)}%
                  </span>
                  <div
                    className="bar-fill gain"
                    style={{ height: `${height}%` }}
                  />
                  <span className="bar-label">{g.symbol.split('/')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Losers */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h2>Top Losers</h2>
            <TrendingDown color="#E94C50" size={24} />
          </div>
          <div className="bar-charts">
            {losers.map((l, i) => {
              const pct = getChangePercent(l);
              const height = Math.max((Math.abs(pct) / maxLoserPct) * 100, 4);
              return (
                <div
                  key={l.symbol}
                  className="bar-column"
                  onClick={() => onSelectSymbol(l.symbol)}
                  style={{ cursor: 'pointer' }}
                  title={`Trade ${l.symbol}`}
                >
                  <span className="bar-percentage" style={{ color: '#E94C50' }}>
                    {pct.toFixed(2)}%
                  </span>
                  <div
                    className="bar-fill loss"
                    style={{ height: `${height}%` }}
                  />
                  <span className="bar-label">{l.symbol.split('/')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="popular-section">
        <h2>Popular Assets</h2>
        <div className="popular-grid">
          {popular.map((asset) => {
            const pct = getChangePercent(asset);
            const isUp = pct >= 0;
            return (
              <div
                key={asset.symbol}
                className="popular-card"
                onClick={() => onSelectSymbol(asset.symbol)}
                title={`Trade ${asset.symbol}`}
              >
                <div className="card-top">
                  <div className="asset-icon-container">
                    {renderAssetIcon(asset)}
                  </div>
                  <button
                    className={`star-btn ${asset.isFavorite ? 'active' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Star
                      size={20}
                      fill={asset.isFavorite ? '#F5C542' : 'none'}
                    />
                  </button>
                </div>
                <div className="asset-info">
                  <h3>{asset.symbol}</h3>
                  <div className={`asset-price ${isUp ? 'up' : 'down'}`}>
                    {asset.currentPrice?.toFixed(4) ||
                      asset.basePrice.toFixed(4)}
                  </div>
                  <div
                    className={`asset-change ${isUp ? 'up' : 'down'}`}
                    title="Change"
                  >
                    {isUp ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span>{Math.abs(pct).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
