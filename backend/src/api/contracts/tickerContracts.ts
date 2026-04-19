import { ParsedQs } from 'qs';
import { PriceUpdate, TickerWithPrice } from '../../domain/models/Ticker';
import { ApiErrorDetail } from './apiResponse';
import {
  DEFAULT_HISTORY_LIMIT,
  MAX_HISTORY_POINTS,
} from '../../config/history';

const SYMBOL_PATTERN = /^[A-Z0-9/-]{1,15}$/;

export type TickerDto = TickerWithPrice;

export interface HistoryQuery {
  symbol: string;
  limit: number;
  from?: number;
  to?: number;
}

export interface HistoryResponseMeta {
  symbol: string;
  count: number;
  limit: number;
  from?: number;
  to?: number;
}

export interface SymbolLookup {
  symbol: string;
}

export function toTickerDto(ticker: TickerWithPrice): TickerDto {
  return {
    symbol: ticker.symbol,
    name: ticker.name,
    basePrice: ticker.basePrice,
    currentPrice: ticker.currentPrice,
    type: ticker.type,
    isFavorite: ticker.isFavorite,
    inPortfolio: ticker.inPortfolio,
    icon: ticker.icon,
  };
}

export function toPriceUpdateDto(update: PriceUpdate): PriceUpdate {
  return {
    symbol: update.symbol,
    price: update.price,
    timestamp: update.timestamp,
  };
}

export function parseHistoryQuery(query: ParsedQs): {
  value?: HistoryQuery;
  errors?: ApiErrorDetail[];
} {
  const errors: ApiErrorDetail[] = [];
  const symbolResult = parseSymbolValue(
    query.symbol,
    'Symbol query parameter is required.',
  );

  if (!symbolResult.value && symbolResult.errors) {
    errors.push(...symbolResult.errors);
  }

  const limit =
    parseOptionalInteger(
      query.limit,
      'limit',
      1,
      MAX_HISTORY_POINTS,
      DEFAULT_HISTORY_LIMIT,
      errors,
    ) ?? DEFAULT_HISTORY_LIMIT;
  const from = parseOptionalInteger(
    query.from,
    'from',
    0,
    Number.MAX_SAFE_INTEGER,
    undefined,
    errors,
  );
  const to = parseOptionalInteger(
    query.to,
    'to',
    0,
    Number.MAX_SAFE_INTEGER,
    undefined,
    errors,
  );

  if (from !== undefined && to !== undefined && from > to) {
    errors.push({
      field: 'from',
      message:
        'The from timestamp must be less than or equal to the to timestamp.',
      value: from,
    });
  }

  if (errors.length > 0 || !symbolResult.value) {
    return { errors };
  }

  return {
    value: {
      symbol: symbolResult.value.symbol,
      limit,
      ...(from === undefined ? {} : { from }),
      ...(to === undefined ? {} : { to }),
    },
  };
}

export function parseTickerSymbol(
  symbol: string | ParsedQs | (string | ParsedQs)[] | undefined,
): {
  value?: SymbolLookup;
  errors?: ApiErrorDetail[];
} {
  return parseSymbolValue(symbol, 'Symbol path parameter is required.');
}

function getSingleValue(
  value: string | ParsedQs | (string | ParsedQs)[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'string' ? firstValue : undefined;
  }

  return undefined;
}

function parseSymbolValue(
  value: string | ParsedQs | (string | ParsedQs)[] | undefined,
  requiredMessage: string,
): {
  value?: SymbolLookup;
  errors?: ApiErrorDetail[];
} {
  const rawSymbol = getSingleValue(value);
  const normalizedSymbol = rawSymbol?.trim().toUpperCase();

  if (!normalizedSymbol) {
    return {
      errors: [
        {
          field: 'symbol',
          message: requiredMessage,
        },
      ],
    };
  }

  if (!SYMBOL_PATTERN.test(normalizedSymbol)) {
    return {
      errors: [
        {
          field: 'symbol',
          message:
            'Symbol must contain only letters, numbers, slashes, or dashes and be at most 15 characters.',
          value: rawSymbol,
        },
      ],
    };
  }

  return {
    value: {
      symbol: normalizedSymbol,
    },
  };
}

function parseOptionalInteger(
  value: string | ParsedQs | (string | ParsedQs)[] | undefined,
  field: string,
  min: number,
  max: number,
  defaultValue: number | undefined,
  errors: ApiErrorDetail[],
): number | undefined {
  const rawValue = getSingleValue(value);

  if (rawValue === undefined || rawValue.trim() === '') {
    return defaultValue;
  }

  if (!/^\d+$/.test(rawValue)) {
    errors.push({
      field,
      message: `${field} must be a whole number.`,
      value: rawValue,
    });
    return defaultValue ?? 0;
  }

  const parsed = Number(rawValue);

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    errors.push({
      field,
      message: `${field} must be between ${min} and ${max}.`,
      value: parsed,
    });
    return defaultValue ?? 0;
  }

  return parsed;
}
