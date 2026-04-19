import { AlertDirection } from '../../domain/models/Alert';
import { ApiErrorDetail } from './apiResponse';
import { parseTickerSymbol } from './tickerContracts';

export interface CreateAlertRequestBody {
  symbol: string;
  targetPrice: number;
  direction: AlertDirection;
}

const isAlertDirection = (value: unknown): value is AlertDirection =>
  value === 'above' || value === 'below';

export function parseCreateAlertBody(
  body: unknown,
  hasTicker: (symbol: string) => boolean,
): {
  value?: CreateAlertRequestBody;
  code?: 'INVALID_SYMBOL' | 'INVALID_TARGET_PRICE' | 'INVALID_DIRECTION';
  message?: string;
  details?: ApiErrorDetail[];
} {
  const record =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const parsedSymbol = parseTickerSymbol(
    typeof record.symbol === 'string' ? record.symbol : undefined,
  );

  if (!parsedSymbol.value || !hasTicker(parsedSymbol.value.symbol)) {
    return {
      code: 'INVALID_SYMBOL',
      message: 'A valid symbol is required.',
      details: parsedSymbol.errors,
    };
  }

  if (
    typeof record.targetPrice !== 'number' ||
    !Number.isFinite(record.targetPrice) ||
    record.targetPrice <= 0
  ) {
    return {
      code: 'INVALID_TARGET_PRICE',
      message: 'A valid target price is required.',
    };
  }

  if (!isAlertDirection(record.direction)) {
    return {
      code: 'INVALID_DIRECTION',
      message: 'Direction must be either above or below.',
    };
  }

  return {
    value: {
      symbol: parsedSymbol.value.symbol,
      targetPrice: record.targetPrice,
      direction: record.direction,
    },
  };
}

export function parseAlertId(value: unknown): {
  value?: string;
  code?: 'INVALID_ALERT_ID';
  message?: string;
} {
  const alertId =
    typeof (Array.isArray(value) ? value[0] : value) === 'string'
      ? (Array.isArray(value) ? value[0] : value).trim()
      : value;

  if (typeof alertId !== 'string' || alertId.length === 0) {
    return {
      code: 'INVALID_ALERT_ID',
      message: 'A valid alert id is required.',
    };
  }

  return { value: alertId };
}
