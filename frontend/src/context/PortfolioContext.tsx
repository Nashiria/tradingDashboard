import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Position {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  units: number;
  openPrice: number;
  margin: number;
}

interface PortfolioContextType {
  balance: number;
  totalDeposited: number;
  deposit: (amount: number) => void;
  positions: Position[];
  openPosition: (position: Omit<Position, 'id'>) => void;
  closePosition: (id: string, closePrice: number) => void;
}

interface PortfolioState {
  balance: number;
  totalDeposited: number;
  positions: Position[];
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PortfolioState>({
    balance: 10000,
    totalDeposited: 10000,
    positions: [],
  });

  const deposit = (amount: number) => {
    setState((prev) => ({
      ...prev,
      balance: prev.balance + amount,
      totalDeposited: prev.totalDeposited + amount,
    }));
  };

  const openPosition = (order: Omit<Position, 'id'>) => {
    setState((prev) => {
      let newBalance = prev.balance;
      const newPositions = [...prev.positions];
      const existingIdx = newPositions.findIndex(
        (p) => p.symbol === order.symbol,
      );

      if (existingIdx >= 0) {
        const existing = newPositions[existingIdx];

        // Same side -> add to position
        if (existing.side === order.side) {
          newBalance -= order.margin;

          const newUnits = existing.units + order.units;
          const newPrice =
            (existing.openPrice * existing.units +
              order.openPrice * order.units) /
            newUnits;
          const newMargin = existing.margin + order.margin;

          newPositions[existingIdx] = {
            ...existing,
            units: newUnits,
            openPrice: newPrice,
            margin: newMargin,
          };
        }
        // Opposite side -> reduce/close position
        else {
          if (order.units === existing.units) {
            // Close exactly
            const isBuy = existing.side === 'buy';
            const pnl = isBuy
              ? (order.openPrice - existing.openPrice) * existing.units
              : (existing.openPrice - order.openPrice) * existing.units;

            newBalance += existing.margin + pnl;
            newPositions.splice(existingIdx, 1);
          } else if (order.units < existing.units) {
            // Partial close
            const isBuy = existing.side === 'buy';
            const pnl = isBuy
              ? (order.openPrice - existing.openPrice) * order.units
              : (existing.openPrice - order.openPrice) * order.units;

            // Release proportional margin
            const marginReleased =
              existing.margin * (order.units / existing.units);
            newBalance += marginReleased + pnl;

            newPositions[existingIdx] = {
              ...existing,
              units: existing.units - order.units,
              margin: existing.margin - marginReleased,
            };
          } else {
            // Close and flip direction
            const isBuy = existing.side === 'buy';
            const pnl = isBuy
              ? (order.openPrice - existing.openPrice) * existing.units
              : (existing.openPrice - order.openPrice) * existing.units;

            const remainingUnits = order.units - existing.units;
            const newMargin = (remainingUnits / order.units) * order.margin;

            // Refund old margin + pnl, then take new margin
            newBalance += existing.margin + pnl - newMargin;

            newPositions[existingIdx] = {
              ...existing,
              side: order.side,
              units: remainingUnits,
              openPrice: order.openPrice,
              margin: newMargin,
            };
          }
        }
      } else {
        // No existing position -> open new
        newBalance -= order.margin;
        newPositions.push({
          ...order,
          id: Math.random().toString(36).substr(2, 9),
        });
      }

      return { ...prev, balance: newBalance, positions: newPositions };
    });
  };

  const closePosition = (id: string, closePrice: number) => {
    setState((prev) => {
      const position = prev.positions.find((p) => p.id === id);
      if (!position) return prev;

      const isBuy = position.side === 'buy';
      const pnl = isBuy
        ? (closePrice - position.openPrice) * position.units
        : (position.openPrice - closePrice) * position.units;

      return {
        ...prev,
        balance: prev.balance + position.margin + pnl,
        positions: prev.positions.filter((p) => p.id !== id),
      };
    });
  };

  return (
    <PortfolioContext.Provider
      value={{
        balance: state.balance,
        totalDeposited: state.totalDeposited,
        deposit,
        positions: state.positions,
        openPosition,
        closePosition,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
