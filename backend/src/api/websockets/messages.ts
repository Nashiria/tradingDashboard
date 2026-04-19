import {
  AlertTriggerEvent,
  isAlertTriggerEvent,
} from '../../domain/models/Alert';
import {
  PriceUpdate,
  TickerWithPrice,
  isPriceUpdate,
} from '../../domain/models/Ticker';

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

export type ClientMessage = PingMessage | SubscribeMessage | UnsubscribeMessage;

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

export type ServerMessage =
  | PongMessage
  | InitialTickersMessage
  | PriceUpdateMessage
  | ErrorMessage
  | AlertTriggeredMessage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const parseClientMessage = (raw: string): ClientMessage | null => {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }

    if (parsed.type === 'PING') {
      return { type: 'PING' };
    }

    if (parsed.type === 'SUBSCRIBE' || parsed.type === 'UNSUBSCRIBE') {
      const ticker =
        typeof parsed.ticker === 'string' ? parsed.ticker : undefined;
      const tickers = isStringArray(parsed.tickers)
        ? parsed.tickers
        : undefined;

      if (!ticker && !tickers) {
        return null;
      }

      return {
        type: parsed.type,
        ticker,
        tickers,
      };
    }

    return null;
  } catch {
    return null;
  }
};

export const parsePriceUpdateMessage = (raw: string): PriceUpdate | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isPriceUpdate(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const parseAlertTriggeredMessage = (
  raw: string,
): AlertTriggerEvent | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAlertTriggerEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
