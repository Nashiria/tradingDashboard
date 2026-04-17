import React, { useState } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Ticker } from '../models/Ticker';
import { formatPrice } from '../helpers/format';

interface SymbolListProps {
  tickers: Ticker[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  spreadAmount: number;
}

export const SymbolList: React.FC<SymbolListProps> = ({ 
  tickers, 
  activeTab, 
  setActiveTab, 
  selectedSymbol, 
  setSelectedSymbol,
  spreadAmount
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickers = tickers.filter(t => {
    const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'Favorites') return t.isFavorite;
    if (activeTab === 'Portfolio') return t.inPortfolio;
    if (activeTab === 'All') return true;
    return t.type === activeTab;
  });

  return (
    <aside className="symbols-panel">
      <div className="symbols-header">Symbols</div>
      
      <div className="symbols-tabs" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0' }}>
        {['Favorites', 'Portfolio', 'All', 'Forex', 'Metals', 'Shares', 'Indices', 'Commodities'].map(tab => (
           <div 
             key={tab}
             className={`tab ${activeTab === tab ? 'active' : ''}`}
             onClick={() => setActiveTab(tab)}
             style={{ paddingBottom: '8px' }}
           >
             {tab} {tab === 'Favorites' && <Star size={12} fill="currentColor" style={{display:'inline', marginLeft:'2px'}}/>}
           </div>
        ))}
      </div>

      <div className="search-container">
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Search Symbols" 
            className="search-input" 
            style={{ paddingLeft: '36px' }} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="symbol-list">
        {filteredTickers.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No symbols found in this category.
          </div>
        )}
        {filteredTickers.map(ticker => {
          const price = ticker.currentPrice ?? ticker.basePrice;
          const diff = price - ticker.basePrice;
          const diffPercent = ((diff / ticker.basePrice) * 100).toFixed(2);
          const isUp = diff >= 0;
          const isSelected = selectedSymbol === ticker.symbol;

          return (
            <div 
              key={ticker.symbol} 
              className={`symbol-card ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedSymbol(ticker.symbol)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {ticker.icon.includes('|') ? (
                    <div style={{ position: 'relative', width: '24px', height: '24px' }}>
                      <img 
                        src={ticker.icon.split('|')[0]} 
                        alt="" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover', zIndex: 1, backgroundColor: 'var(--bg-primary)' }} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          const part = ticker.symbol.split('/')[0] || ticker.symbol.split('-')[0] || 'X';
                          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%231F2937"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="40" font-family="system-ui, sans-serif" font-weight="bold">${part.substring(0, 2)}</text></svg>`;
                          e.currentTarget.src = `data:image/svg+xml;utf8,${svg}`;
                        }}
                      />
                      <img 
                        src={ticker.icon.split('|')[1]} 
                        alt="" 
                        style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${isSelected ? 'var(--bg-surface)' : 'var(--bg-secondary)'}`, zIndex: 2, backgroundColor: 'var(--bg-primary)' }} 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          const part = ticker.symbol.split('/')[1] || ticker.symbol.split('-')[1] || 'Y';
                          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23374151"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="40" font-family="system-ui, sans-serif" font-weight="bold">${part.substring(0, 2)}</text></svg>`;
                          e.currentTarget.src = `data:image/svg+xml;utf8,${svg}`;
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={ticker.icon} 
                        alt={ticker.symbol} 
                        style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'var(--bg-primary)' }} 
                        onError={(e) => { 
                          e.currentTarget.onerror = null; 
                          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%231F2937"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="48" font-family="system-ui, sans-serif" font-weight="bold">${ticker.symbol[0]}</text></svg>`;
                          e.currentTarget.src = `data:image/svg+xml;utf8,${svg}`;
                        }}
                      />
                    </div>
                  )}
                  <span className="text-h2" style={{ fontSize: '14px' }}>{ticker.symbol}</span>
                  {ticker.isFavorite && <Star size={12} fill="var(--accent-demo)" color="var(--accent-demo)" />}
                </div>
                <span className="text-caption">{ticker.name}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className={`text-caption ${isUp ? 'text-up' : 'text-down'}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(Number(diffPercent))}%
                </div>
                <div className="text-price" style={{ fontSize: '13px' }}>{formatPrice(price)}</div>
                <div className="text-caption" style={{ color: 'var(--text-muted)' }}>{formatPrice(price + spreadAmount)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
