export const DEFAULT_SIMULATED_SPREAD_PIPS = 1.3;

interface SimulatedQuote {
  spreadPips: number;
  spreadAmount: number;
  bidPrice: number;
  askPrice: number;
}

export const getSimulatedQuote = (
  currentPrice: number,
  spreadPips: number = DEFAULT_SIMULATED_SPREAD_PIPS,
): SimulatedQuote => {
  const spreadAmount = spreadPips * 0.0001;

  return {
    spreadPips,
    spreadAmount,
    bidPrice: currentPrice,
    askPrice: currentPrice + spreadAmount,
  };
};
