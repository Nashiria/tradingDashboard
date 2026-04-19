import { AlertTriggerEvent, PriceAlert } from '../models/Alert';

export interface IAlertRepository {
  createAlert(alert: Omit<PriceAlert, 'id'>): Promise<PriceAlert>;
  listAlertsByUser(userId: string): Promise<PriceAlert[]>;
  getActiveAlertsBySymbol(symbol: string): Promise<PriceAlert[]>;
  deleteAlert(userId: string, alertId: string): Promise<boolean>;
  markTriggered(
    alertId: string,
    triggeredAt: number,
  ): Promise<PriceAlert | null>;
  publishAlertTriggered(event: AlertTriggerEvent): Promise<void>;
}
