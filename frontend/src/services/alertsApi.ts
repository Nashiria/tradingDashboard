import { AlertDirection, PriceAlert, isPriceAlert } from '../models/Alert';
import { apiClient, extractApiData } from './apiClient';

export const alertsApi = {
  async listAlerts(): Promise<PriceAlert[]> {
    const response = await apiClient.get('/api/alerts');

    const alerts = extractApiData<unknown>(response);
    return Array.isArray(alerts) ? alerts.filter(isPriceAlert) : [];
  },

  async createAlert(payload: {
    symbol: string;
    targetPrice: number;
    direction: AlertDirection;
  }): Promise<PriceAlert> {
    const response = await apiClient.post('/api/alerts', payload);

    const alert = extractApiData<unknown>(response);

    if (!isPriceAlert(alert)) {
      throw new Error('Invalid price alert response.');
    }

    return alert;
  },

  async deleteAlert(alertId: string): Promise<void> {
    await apiClient.delete(`/api/alerts/${alertId}`);
  },
};
