export type AlertDirection = 'above' | 'below';

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: number;
  direction: AlertDirection;
  createdAt: number;
  triggeredAt?: number;
}

export interface AlertTriggerEvent {
  userId: string;
  price: number;
  timestamp: number;
  alert: PriceAlert;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isPriceAlert = (value: unknown): value is PriceAlert =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.userId === 'string' &&
  typeof value.symbol === 'string' &&
  typeof value.targetPrice === 'number' &&
  (value.direction === 'above' || value.direction === 'below') &&
  typeof value.createdAt === 'number' &&
  (value.triggeredAt === undefined || typeof value.triggeredAt === 'number');

export const isAlertTriggerEvent = (
  value: unknown,
): value is AlertTriggerEvent =>
  isRecord(value) &&
  typeof value.userId === 'string' &&
  typeof value.price === 'number' &&
  typeof value.timestamp === 'number' &&
  isPriceAlert(value.alert);
