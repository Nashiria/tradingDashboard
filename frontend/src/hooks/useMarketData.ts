import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TickerWithPrice } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { marketDataApi } from '../services/marketDataApi';
import { parseMarketDataMessage } from '../services/marketDataSocket';
import {
  createMockTickers,
  evolveMockTickers,
} from '../services/mockMarketData';

const PRICE_UPDATE_BATCH_MS = 100;
const INITIAL_FALLBACK_DELAY_MS = 1200;
const RECONNECT_FALLBACK_DELAY_MS = 2500;
const FAVORITES_STORAGE_KEY_PREFIX = 'trading-dashboard:favorites';

export interface MarketDataState {
  tickers: TickerWithPrice[];
  isUsingFallbackData: boolean;
  toggleFavorite: (symbol: string) => void;
}

const applyFavoriteOverride = (
  tickers: TickerWithPrice[],
  favoriteSymbols: Set<string> | null,
): TickerWithPrice[] => {
  if (!favoriteSymbols) {
    return tickers;
  }

  return tickers.map((ticker) => ({
    ...ticker,
    isFavorite: favoriteSymbols.has(ticker.symbol),
  }));
};

const getFavoriteStorageKey = (userId: string) =>
  `${FAVORITES_STORAGE_KEY_PREFIX}:${userId}`;

const readStoredFavoriteSymbols = (userId: string): Set<string> | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(getFavoriteStorageKey(userId));
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return new Set(
      parsed.filter((value): value is string => typeof value === 'string'),
    );
  } catch {
    return null;
  }
};

const persistFavoriteSymbols = (
  userId: string,
  favoriteSymbols: Set<string>,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getFavoriteStorageKey(userId),
    JSON.stringify(Array.from(favoriteSymbols).sort()),
  );
};

export const useMarketDataSource = (): MarketDataState => {
  const [rawTickers, setRawTickers] = useState<TickerWithPrice[]>([]);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);
  const [favoriteOverride, setFavoriteOverride] = useState<Set<string> | null>(
    null,
  );
  const { ws, connectionState } = useWebSocket();
  const { user } = useAuth();
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      setFavoriteOverride(null);
      return;
    }

    setFavoriteOverride(readStoredFavoriteSymbols(user.id));
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    marketDataApi
      .getTickers()
      .then((data) => {
        if (!isMounted || data.length === 0) {
          return;
        }

        setRawTickers(data);
        setIsUsingFallbackData(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setRawTickers((current) =>
          current.length > 0 ? current : createMockTickers(),
        );
        setIsUsingFallbackData(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const shouldPrimeFallback =
      rawTickers.length === 0 && connectionState !== 'connected';
    const shouldResumeFallback =
      rawTickers.length > 0 &&
      connectionState === 'reconnecting' &&
      !isUsingFallbackData;

    if (!shouldPrimeFallback && !shouldResumeFallback) {
      return;
    }

    const timeout = setTimeout(
      () => {
        setRawTickers((current) =>
          current.length > 0 ? current : createMockTickers(),
        );
        setIsUsingFallbackData(true);
      },
      shouldPrimeFallback
        ? INITIAL_FALLBACK_DELAY_MS
        : RECONNECT_FALLBACK_DELAY_MS,
    );

    return () => {
      clearTimeout(timeout);
    };
  }, [connectionState, isUsingFallbackData, rawTickers.length]);

  const flushPendingUpdates = useCallback(() => {
    flushTimeoutRef.current = null;

    if (pendingUpdatesRef.current.size === 0) {
      return;
    }

    const updates = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current.clear();

    setRawTickers((previousTickers) => {
      let hasChanges = false;

      const nextTickers = previousTickers.map((ticker) => {
        const nextPrice = updates.get(ticker.symbol);
        if (nextPrice === undefined || ticker.currentPrice === nextPrice) {
          return ticker;
        }

        hasChanges = true;
        return { ...ticker, currentPrice: nextPrice };
      });

      return hasChanges ? nextTickers : previousTickers;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      return;
    }

    flushTimeoutRef.current = setTimeout(
      flushPendingUpdates,
      PRICE_UPDATE_BATCH_MS,
    );
  }, [flushPendingUpdates]);

  useEffect(() => {
    if (!ws) {
      return;
    }

    const pendingUpdates = pendingUpdatesRef.current;
    const handleMessage = (event: MessageEvent) => {
      const message = parseMarketDataMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'INITIAL_TICKERS') {
        pendingUpdates.clear();
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current);
          flushTimeoutRef.current = null;
        }
        setIsUsingFallbackData(false);
        setRawTickers(message.data);
        return;
      }

      if (message.type === 'PRICE_UPDATE') {
        pendingUpdates.set(message.data.symbol, message.data.price);
        scheduleFlush();
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      pendingUpdates.clear();
    };
  }, [scheduleFlush, ws]);

  useEffect(() => {
    if (!isUsingFallbackData) {
      return;
    }

    const interval = setInterval(() => {
      setRawTickers((current) =>
        evolveMockTickers(current.length > 0 ? current : createMockTickers()),
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isUsingFallbackData]);

  const tickers = useMemo(
    () => applyFavoriteOverride(rawTickers, favoriteOverride),
    [favoriteOverride, rawTickers],
  );

  const toggleFavorite = useCallback(
    (symbol: string) => {
      if (!user) {
        return;
      }

      setFavoriteOverride((currentOverride) => {
        const nextFavorites = new Set(
          currentOverride ??
            tickers
              .filter((ticker) => ticker.isFavorite)
              .map((ticker) => ticker.symbol),
        );

        if (nextFavorites.has(symbol)) {
          nextFavorites.delete(symbol);
        } else {
          nextFavorites.add(symbol);
        }

        persistFavoriteSymbols(user.id, nextFavorites);
        return nextFavorites;
      });
    },
    [tickers, user],
  );

  return { tickers, isUsingFallbackData, toggleFavorite };
};

export const useMarketData = useMarketDataSource;
