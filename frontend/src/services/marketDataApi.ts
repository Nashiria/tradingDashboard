import {
  PriceUpdate,
  TickerWithPrice,
  isPriceUpdate,
  isTickerWithPrice,
} from '../models/Ticker';
import { apiClient, extractApiData } from './apiClient';

interface TickerHistoryParams {
  symbol: string;
  limit: number;
  to?: number;
}

export const marketDataApi = {
  async getTickers(): Promise<TickerWithPrice[]> {
    const response = await apiClient.get('/api/tickers');
    const payload = extractApiData<unknown>(response);
    return Array.isArray(payload) ? payload.filter(isTickerWithPrice) : [];
  },

  async getTickerHistory(
    symbol: string,
    toTimestamp?: number,
  ): Promise<PriceUpdate[]> {
    const params: TickerHistoryParams = {
      symbol,
      limit: 600,
    };

    if (toTimestamp) {
      params.to = toTimestamp;
    }

    const response = await apiClient.get('/api/tickers/history', { params });

    const payload = extractApiData<unknown>(response);
    return Array.isArray(payload) ? payload.filter(isPriceUpdate) : [];
  },
};
