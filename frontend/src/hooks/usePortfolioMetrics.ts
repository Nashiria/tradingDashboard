import { useMemo } from 'react';
import { useMarketData } from '../context/MarketDataContext';
import { usePortfolio } from '../context/PortfolioContext';
import { calculatePortfolioMetrics } from '../helpers/portfolio';

export const usePortfolioMetrics = () => {
  const { tickers } = useMarketData();
  const { balance, totalDeposited, positions } = usePortfolio();

  return useMemo(
    () =>
      calculatePortfolioMetrics({
        balance,
        totalDeposited,
        positions,
        tickers,
      }),
    [balance, positions, tickers, totalDeposited],
  );
};
