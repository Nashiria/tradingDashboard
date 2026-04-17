export const formatPrice = (price: number, decimals?: number): string => {
  if (typeof price !== 'number' || isNaN(price)) return '0.00';

  // Eğer basamak sayısı manuel verilmemişse, fiyata göre otomatik belirle
  let d = decimals;
  if (d === undefined) {
    if (price >= 1000) {
      d = 2; // BTC, Endeksler (Örn: 63,444.91)
    } else if (price >= 10) {
      d = 2; // Hisse senetleri, JPY pariteleri (Örn: 150.25)
    } else {
      d = 5; // Klasik Forex ve altcoinler (Örn: 1.09245)
    }
  }

  return price.toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
};
