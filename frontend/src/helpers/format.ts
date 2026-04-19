export const formatPrice = (price: number, decimals?: number): string => {
  if (typeof price !== 'number' || isNaN(price)) return '0.00';

  // Determine the number of decimal places based on the price magnitude if not explicitly provided
  let d = decimals;
  if (d === undefined) {
    if (price >= 1000) {
      d = 2; // BTC, Indexes (Example: 45000.25)
    } else if (price >= 10) {
      d = 2; // Stocks, JPY pairs (Example: 150.25)
    } else {
      d = 5; // Classic Forex and altcoins (Example: 1.09245)
    }
  }

  return price.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
