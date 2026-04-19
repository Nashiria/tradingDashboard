import React, { createContext, ReactNode, useContext } from 'react';
import { MarketDataState, useMarketDataSource } from '../hooks/useMarketData';

const MarketDataContext = createContext<MarketDataState | null>(null);

export const MarketDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const marketData = useMarketDataSource();

  return (
    <MarketDataContext.Provider value={marketData}>
      {children}
    </MarketDataContext.Provider>
  );
};

export const useMarketData = (): MarketDataState => {
  const context = useContext(MarketDataContext);

  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }

  return context;
};
