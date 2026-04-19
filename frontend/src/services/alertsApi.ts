import { AlertDirection, PriceAlert, isPriceAlert } from '../models/Alert';
import { apiClient, createAuthHeaders, extractApiData } from './apiClient';

export const alertsApi = {
  async listAlerts(token: string): Promise<PriceAlert[]> {
    const response = await apiClient.get('/api/alerts', {
      headers: createAuthHeaders(token),
    });

    const alerts = extractApiData<unknown>(response);
    return Array.isArray(alerts) ? alerts.filter(isPriceAlert) : [];
  },

  async createAlert(
    token: string,
    payload: { symbol: string; targetPrice: number; direction: AlertDirection },
  ): Promise<PriceAlert> {
    const response = await apiClient.post('/api/alerts', payload, {
      headers: createAuthHeaders(token),
    });

    const alert = extractApiData<unknown>(response);

    if (!isPriceAlert(alert)) {
      throw new Error('Invalid price alert response.');
    }

    return alert;
  },

  async deleteAlert(token: string, alertId: string): Promise<void> {
    await apiClient.delete(`/api/alerts/${alertId}`, {
      headers: createAuthHeaders(token),
    });
  },
};
