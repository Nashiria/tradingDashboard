import React, { useState, useEffect, useMemo } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import { useTickerHistory } from '../hooks/useTickerHistory';
import { ChartComponent } from '../components/ChartComponent';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { SymbolList } from '../components/SymbolList';
import { OrderPanel } from '../components/OrderPanel';
import { Star, ChevronDown, Activity, Crosshair, MousePointer2, ArrowRight, Pencil } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export const Dashboard: React.FC = () => {
  const { ws } = useWebSocket();
  const { tickers } = useMarketData();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EUR/USD');
  const [activeTab, setActiveTab] = useState<string>('All');
  const { history, isLoading } = useTickerHistory(selectedSymbol);

  const activeTicker = tickers.find(t => t.symbol === selectedSymbol);
  const currentPrice = activeTicker?.currentPrice ?? activeTicker?.basePrice ?? 0;
  
  const visibleSymbolsString = useMemo(() => {
    return tickers.filter(t => {
      if (activeTab === 'Favorites') return t.isFavorite;
      if (activeTab === 'Portfolio') return t.inPortfolio;
      if (activeTab === 'All') return true;
      return t.type === activeTab;
    }).map(t => t.symbol).sort().join(',');
  }, [tickers, activeTab]);

  useEffect(() => {
    if (!ws) return;

    const visibleSymbols = visibleSymbolsString ? visibleSymbolsString.split(',') : [];
    const symbolsToSubscribe = Array.from(new Set([...visibleSymbols, selectedSymbol]));
    
    const subscribe = () => {
      if (ws.readyState === WebSocket.OPEN && symbolsToSubscribe.length > 0) {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: symbolsToSubscribe }));
      }
    };

    subscribe();

    const handleOpen = () => subscribe();
    ws.addEventListener('open', handleOpen);

    return () => {
      if (ws.readyState === WebSocket.OPEN && symbolsToSubscribe.length > 0) {
        ws.send(JSON.stringify({ type: 'UNSUBSCRIBE', tickers: symbolsToSubscribe }));
      }
      ws.removeEventListener('open', handleOpen);
    };
  }, [ws, visibleSymbolsString, selectedSymbol]);

  // Spread, Bid/Ask
  const spreadPips = 1.3;
  const spreadAmount = spreadPips * 0.0001; 
  const bidPrice = currentPrice;
  const askPrice = currentPrice + spreadAmount;

  return (
    <div className="layout-container">
      <Header />

      <main className="main-content">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <SymbolList 
          tickers={tickers} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          selectedSymbol={selectedSymbol} 
          setSelectedSymbol={setSelectedSymbol} 
          spreadAmount={spreadAmount} 
        />

        <section className="chart-area">
          <div className="chart-toolbar">
            <Star 
              size={20} 
              color={activeTicker?.isFavorite ? "var(--accent-demo)" : "var(--text-muted)"} 
              fill={activeTicker?.isFavorite ? "var(--accent-demo)" : "transparent"}
              className="chart-toolbar-icon"
            />
            <div className="chart-toolbar-symbol">
              <span className="text-h2">{selectedSymbol}</span>
              <span className="text-caption text-up">LIVE</span>
            </div>
            <div className="chart-toolbar-timeframe">
              <span className="text-price">5s</span>
              <ChevronDown size={16} color="var(--text-muted)" />
            </div>
            <div className="chart-toolbar-indicators">
              <Activity size={16} /> Indicators
            </div>
          </div>

          <div className="chart-main">
            <div className="drawing-tools">
              <div className="tool-btn"><Crosshair size={20} /></div>
              <div className="tool-btn"><MousePointer2 size={20} /></div>
              <div className="tool-btn"><ArrowRight size={20} /></div>
              <div className="tool-btn"><Pencil size={20} /></div>
            </div>
            
            <div className="chart-container">
              {isLoading ? (
                <div className="chart-loading">Loading chart data...</div>
              ) : (
                <div className="chart-wrapper">
                  <ChartComponent data={history} symbol={selectedSymbol} />
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
        />
      </main>
    </div>
  );
};
