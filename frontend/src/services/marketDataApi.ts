import {
  PriceUpdate,
  TickerWithPrice,
  isPriceUpdate,
  isTickerWithPrice,
} from '../models/Ticker';
import { apiClient, extractApiData } from './apiClient';

export const marketDataApi = {
  async getTickers(): Promise<TickerWithPrice[]> {
    const response = await apiClient.get('/api/tickers');
    const payload = extractApiData<unknown>(response);
    return Array.isArray(payload) ? payload.filter(isTickerWithPrice) : [];
  },

  async getTickerHistory(symbol: string): Promise<PriceUpdate[]> {
    const response = await apiClient.get('/api/tickers/history', {
      params: {
        symbol,
        limit: 600,
      },
    });

    const payload = extractApiData<unknown>(response);
    return Array.isArray(payload) ? payload.filter(isPriceUpdate) : [];
  },
};
