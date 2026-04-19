import { Position } from '../context/PortfolioContext';
import { TickerWithPrice } from '../models/Ticker';

export interface PortfolioMetrics {
  marginUsed: number;
  floatingPnl: number;
  equity: number;
  freeMargin: number;
  marginLevel: number;
  changePct: number;
}

const buildTickerPriceMap = (tickers: TickerWithPrice[]): Map<string, number> =>
  new Map(
    tickers.map((ticker) => [
      ticker.symbol,
      ticker.currentPrice ?? ticker.basePrice,
    ]),
  );

export const calculatePositionPnl = (
  position: Position,
  currentPrice: number,
): number =>
  position.side === 'buy'
    ? (currentPrice - position.openPrice) * position.units
    : (position.openPrice - currentPrice) * position.units;

export const calculatePortfolioMetrics = ({
  balance,
  totalDeposited,
  positions,
  tickers,
}: {
  balance: number;
  totalDeposited: number;
  positions: Position[];
  tickers: TickerWithPrice[];
}): PortfolioMetrics => {
  const pricesBySymbol = buildTickerPriceMap(tickers);
  const marginUsed = positions.reduce(
    (sum, position) => sum + position.margin,
    0,
  );
  const floatingPnl = positions.reduce((sum, position) => {
    const currentPrice =
      pricesBySymbol.get(position.symbol) ?? position.openPrice;
    return sum + calculatePositionPnl(position, currentPrice);
  }, 0);

  const equity = balance + marginUsed + floatingPnl;
  const freeMargin = equity - marginUsed;
  const marginLevel = marginUsed > 0 ? (equity / marginUsed) * 100 : 0;
  const changePct =
    totalDeposited > 0 ? ((equity - totalDeposited) / totalDeposited) * 100 : 0;

  return {
    marginUsed,
    floatingPnl,
    equity,
    freeMargin,
    marginLevel,
    changePct,
  };
};
