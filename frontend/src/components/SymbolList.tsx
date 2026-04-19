import React, { useState } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import {
  DASHBOARD_TABS,
  DashboardTab,
  TickerWithPrice,
} from '../models/Ticker';
import { formatPrice } from '../helpers/format';
import { usePortfolio } from '../context/PortfolioContext';

const activateOnKeyDown = (
  event: React.KeyboardEvent<HTMLElement>,
  onActivate: () => void,
) => {
  if (event.target !== event.currentTarget) {
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
};

const getSymbolParts = (symbol: string): [string, string] => {
  const [primary = symbol, secondary = symbol] = symbol.split(/[/-]/);
  return [primary, secondary];
};

interface SymbolIconImageProps {
  src: string;
  alt: string;
  fallbackLabel: string;
  className: string;
  fallbackClassName?: string;
}

const SymbolIconImage: React.FC<SymbolIconImageProps> = ({
  src,
  alt,
  fallbackLabel,
  className,
  fallbackClassName,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${className} symbol-icon-fallback ${fallbackClassName ?? ''}`.trim()}
        aria-hidden="true"
      >
        {fallbackLabel.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

interface TickerIconProps {
  ticker: TickerWithPrice;
  isSelected: boolean;
}

const TickerIcon: React.FC<TickerIconProps> = ({ ticker, isSelected }) => {
  const [primaryLabel, secondaryLabel] = getSymbolParts(ticker.symbol);

  if (ticker.icon.includes('|')) {
    const [primaryIcon, secondaryIcon] = ticker.icon.split('|');

    return (
      <div className="symbol-pair-icon" aria-hidden="true">
        <SymbolIconImage
          src={primaryIcon}
          alt=""
          className="symbol-pair-icon-primary"
          fallbackLabel={primaryLabel}
          fallbackClassName="symbol-pair-icon-fallback-primary"
        />
        <SymbolIconImage
          src={secondaryIcon}
          alt=""
          className={`symbol-pair-icon-secondary ${isSelected ? 'selected' : ''}`}
          fallbackLabel={secondaryLabel}
          fallbackClassName="symbol-pair-icon-fallback-secondary"
        />
      </div>
    );
  }

  return (
    <div className="symbol-single-icon-wrapper" aria-hidden="true">
      <SymbolIconImage
        src={ticker.icon}
        alt=""
        className="symbol-single-icon"
        fallbackLabel={ticker.symbol}
        fallbackClassName="symbol-single-icon-fallback"
      />
    </div>
  );
};

interface SymbolListProps {
  tickers: TickerWithPrice[];
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  spreadAmount: number;
  isAuthenticated: boolean;
  onRequireAuth: (reason: string) => void;
  onToggleFavorite: (symbol: string) => void;
}

export const SymbolList: React.FC<SymbolListProps> = ({
  tickers,
  activeTab,
  setActiveTab,
  selectedSymbol,
  setSelectedSymbol,
  spreadAmount,
  isAuthenticated,
  onRequireAuth,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { positions } = usePortfolio();
  const tabs = DASHBOARD_TABS;

  const filteredTickers = tickers.filter((t) => {
    const matchesSearch =
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'Favorites') return t.isFavorite;
    if (activeTab === 'Portfolio')
      return positions.some((p) => p.symbol === t.symbol);
    if (activeTab === 'All') return true;
    return t.type === activeTab;
  });

  return (
    <aside className="symbols-panel">
      <div className="symbols-header">Symbols</div>

      <div
        className="symbols-tabs symbols-tabs-scrollable"
        role="tablist"
        aria-label="Symbol filters"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`tab symbols-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              if (
                !isAuthenticated &&
                (tab === 'Favorites' || tab === 'Portfolio')
              ) {
                onRequireAuth(
                  `Sign in to open your ${tab.toLowerCase()} view.`,
                );
                return;
              }

              setActiveTab(tab);
            }}
          >
            {tab}
            {tab === 'Favorites' && (
              <Star
                size={12}
                fill="currentColor"
                className="symbols-tab-star"
              />
            )}
          </button>
        ))}
      </div>

      <div className="search-container">
        <div className="search-field">
          <Search
            size={16}
            color="var(--text-muted)"
            className="search-field-icon"
          />
          <input
            type="text"
            placeholder="Search Symbols"
            className="search-input search-input-with-icon"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="symbol-list">
        {filteredTickers.length === 0 && (
          <div className="symbols-empty-state">
            No symbols found in this category.
          </div>
        )}
        {filteredTickers.map((ticker) => {
          const price = ticker.currentPrice ?? ticker.basePrice;
          const diff = price - ticker.basePrice;
          const diffPercent = ((diff / ticker.basePrice) * 100).toFixed(2);
          const isUp = diff >= 0;
          const isSelected = selectedSymbol === ticker.symbol;
          const userPosition = positions.find(
            (p) => p.symbol === ticker.symbol,
          );

          return (
            <div
              key={ticker.symbol}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`symbol-card ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedSymbol(ticker.symbol)}
              onKeyDown={(event) =>
                activateOnKeyDown(event, () => setSelectedSymbol(ticker.symbol))
              }
            >
              <div className="symbol-card-details">
                <div className="symbol-card-header-row">
                  <TickerIcon ticker={ticker} isSelected={isSelected} />
                  <span className="text-h2 symbol-card-symbol">
                    {ticker.symbol}
                  </span>
                  {userPosition && (
                    <span
                      className="text-caption"
                      style={{
                        marginLeft: 6,
                        padding: '2px 4px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 4,
                      }}
                    >
                      {userPosition.side.toUpperCase()}:{' '}
                      {userPosition.units.toLocaleString()}
                    </span>
                  )}
                  <button
                    className={`symbol-favorite-button ${ticker.isFavorite ? 'is-active' : ''}`}
                    type="button"
                    aria-label={`Manage favorites for ${ticker.symbol}`}
                    aria-pressed={ticker.isFavorite}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!isAuthenticated) {
                        onRequireAuth(
                          `Sign in to manage favorites for ${ticker.symbol}.`,
                        );
                        return;
                      }

                      onToggleFavorite(ticker.symbol);
                    }}
                  >
                    <Star
                      size={12}
                      fill={
                        ticker.isFavorite ? 'var(--accent-demo)' : 'transparent'
                      }
                      color={
                        ticker.isFavorite
                          ? 'var(--accent-demo)'
                          : 'var(--text-muted)'
                      }
                    />
                  </button>
                </div>
                <span className="text-caption">{ticker.name}</span>
              </div>

              <div className="symbol-card-pricing">
                <div
                  className={`text-caption symbol-card-change ${isUp ? 'text-up' : 'text-down'}`}
                >
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{' '}
                  {Math.abs(Number(diffPercent))}%
                </div>
                <div className="text-price symbol-card-price">
                  {formatPrice(price)}
                </div>
                <div className="text-caption symbol-card-spread-price">
                  {formatPrice(price + spreadAmount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
