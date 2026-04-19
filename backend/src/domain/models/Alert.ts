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
  alert: PriceAlert;
  price: number;
  timestamp: number;
}
