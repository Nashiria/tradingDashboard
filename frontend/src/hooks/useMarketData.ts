import { useState, useEffect, useRef, useCallback } from 'react';
import { TickerWithPrice } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';
import { marketDataApi } from '../services/marketDataApi';
import { parseMarketDataMessage } from '../services/marketDataSocket';
import {
  createMockTickers,
  evolveMockTickers,
} from '../services/mockMarketData';

const PRICE_UPDATE_BATCH_MS = 100;

export const useMarketData = () => {
  const [tickers, setTickers] = useState<TickerWithPrice[]>([]);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);
  const { ws } = useWebSocket();
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    marketDataApi
      .getTickers()
      .then((data) => {
        if (!isMounted || data.length === 0) {
          return;
        }

        setTickers(data);
        setIsUsingFallbackData(false);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setTickers((current) =>
          current.length > 0 ? current : createMockTickers(),
        );
        setIsUsingFallbackData(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (tickers.length > 0 || ws) {
      return;
    }

    const timeout = setTimeout(() => {
      setTickers((current) =>
        current.length > 0 ? current : createMockTickers(),
      );
      setIsUsingFallbackData(true);
    }, 1200);

    return () => {
      clearTimeout(timeout);
    };
  }, [tickers.length, ws]);

  const flushPendingUpdates = useCallback(() => {
    flushTimeoutRef.current = null;

    if (pendingUpdatesRef.current.size === 0) {
      return;
    }

    const updates = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current.clear();

    setTickers((prevTickers) => {
      let hasChanges = false;

      const nextTickers = prevTickers.map((ticker) => {
        const nextPrice = updates.get(ticker.symbol);
        if (nextPrice === undefined || ticker.currentPrice === nextPrice) {
          return ticker;
        }

        hasChanges = true;
        return { ...ticker, currentPrice: nextPrice };
      });

      return hasChanges ? nextTickers : prevTickers;
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
    if (!ws) return;

    const pendingUpdates = pendingUpdatesRef.current;

    const handleMessage = (event: MessageEvent) => {
      const message = parseMarketDataMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'INITIAL_TICKERS') {
        pendingUpdatesRef.current.clear();
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current);
          flushTimeoutRef.current = null;
        }
        setIsUsingFallbackData(false);
        setTickers(message.data);
      } else if (message.type === 'PRICE_UPDATE') {
        const update = message.data;
        pendingUpdatesRef.current.set(update.symbol, update.price);
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
      setTickers((current) =>
        evolveMockTickers(current.length > 0 ? current : createMockTickers()),
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isUsingFallbackData]);

  return { tickers, isUsingFallbackData };
};
