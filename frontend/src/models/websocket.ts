import { AlertTriggerEvent, isAlertTriggerEvent } from './Alert';
import {
  PriceUpdate,
  TickerWithPrice,
  isPriceUpdate,
  isTickerWithPrice,
} from './Ticker';

export interface PingMessage {
  type: 'PING';
}

export interface SubscribeMessage {
  type: 'SUBSCRIBE';
  ticker?: string;
  tickers?: string[];
}

export interface UnsubscribeMessage {
  type: 'UNSUBSCRIBE';
  ticker?: string;
  tickers?: string[];
}

export type OutgoingWebSocketMessage =
  | PingMessage
  | SubscribeMessage
  | UnsubscribeMessage;

export interface PongMessage {
  type: 'PONG';
}

export interface InitialTickersMessage {
  type: 'INITIAL_TICKERS';
  data: TickerWithPrice[];
}

export interface PriceUpdateMessage {
  type: 'PRICE_UPDATE';
  data: PriceUpdate;
}

export interface ErrorMessage {
  type: 'ERROR';
  message: string;
  invalidTickers?: string[];
}

export interface AlertTriggeredMessage {
  type: 'ALERT_TRIGGERED';
  data: AlertTriggerEvent;
}

export type IncomingWebSocketMessage =
  | PongMessage
  | InitialTickersMessage
  | PriceUpdateMessage
  | ErrorMessage
  | AlertTriggeredMessage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const serializeWebSocketMessage = (
  message: OutgoingWebSocketMessage,
): string => JSON.stringify(message);

export const parseWebSocketMessage = (
  data: string,
): IncomingWebSocketMessage | null => {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }

    if (parsed.type === 'PONG') {
      return { type: 'PONG' };
    }

    if (
      parsed.type === 'INITIAL_TICKERS' &&
      Array.isArray(parsed.data) &&
      parsed.data.every(isTickerWithPrice)
    ) {
      return {
        type: 'INITIAL_TICKERS',
        data: parsed.data,
      };
    }

    if (parsed.type === 'PRICE_UPDATE' && isPriceUpdate(parsed.data)) {
      return {
        type: 'PRICE_UPDATE',
        data: parsed.data,
      };
    }

    if (parsed.type === 'ERROR' && typeof parsed.message === 'string') {
      return {
        type: 'ERROR',
        message: parsed.message,
        invalidTickers:
          Array.isArray(parsed.invalidTickers) &&
          parsed.invalidTickers.every((ticker) => typeof ticker === 'string')
            ? parsed.invalidTickers
            : undefined,
      };
    }

    if (parsed.type === 'ALERT_TRIGGERED' && isAlertTriggerEvent(parsed.data)) {
      return {
        type: 'ALERT_TRIGGERED',
        data: parsed.data,
      };
    }

    return null;
  } catch {
    return null;
  }
};
