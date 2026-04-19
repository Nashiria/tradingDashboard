import { useState, useEffect, useRef, useCallback } from 'react';
import { PriceUpdate } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';
import { marketDataApi } from '../services/marketDataApi';
import {
  parseMarketDataMessage,
  subscribeToTicker,
  unsubscribeFromTicker,
} from '../services/marketDataSocket';
import {
  createMockHistory,
  evolveMockHistory,
} from '../services/mockMarketData';

const MAX_HISTORY_POINTS = 600;
const RECONNECT_FALLBACK_DELAY_MS = 2500;

export const useTickerHistory = (symbol: string | null) => {
  const [history, setHistory] = useState<PriceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUsingFallbackHistory, setIsUsingFallbackHistory] = useState(false);
  const isMountedRef = useRef(true);
  const isFetchingMoreRef = useRef(false);
  const latestHistoryPriceRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef(0);
  const { ws, connectionState } = useWebSocket();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestHistoryPriceRef.current = history[history.length - 1]?.price;
  }, [history]);

  useEffect(() => {
    latestHistoryPriceRef.current = undefined;
  }, [symbol]);

  const fetchHistory = useCallback(
    async (
      nextSymbol: string,
      options: { useFallbackOnFailure: boolean; referencePrice?: number },
    ) => {
      const requestId = ++requestIdRef.current;

      if (!isMountedRef.current) {
        return;
      }

      setIsLoading(true);

      try {
        const data = await marketDataApi.getTickerHistory(nextSymbol);
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setHistory(data);
        setIsUsingFallbackHistory(false);
      } catch {
        if (
          options.useFallbackOnFailure &&
          isMountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setHistory(createMockHistory(nextSymbol, options.referencePrice));
          setIsUsingFallbackHistory(true);
        }
      } finally {
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const loadMoreHistory = async () => {
    if (!symbol || history.length === 0 || isFetchingMoreRef.current) return;

    isFetchingMoreRef.current = true;
    try {
      const oldestTimestamp = history[0].timestamp;
      const olderData = await marketDataApi.getTickerHistory(
        symbol,
        oldestTimestamp - 1,
      );

      if (olderData.length > 0) {
        setHistory((prev) => {
          const map = new Map<number, PriceUpdate>();
          olderData.forEach((item) => map.set(item.timestamp, item));
          prev.forEach((item) => map.set(item.timestamp, item));
          return Array.from(map.values()).sort(
            (a, b) => a.timestamp - b.timestamp,
          );
        });
      }
    } catch (error) {
      console.error('Failed to load older history:', error);
    } finally {
      isFetchingMoreRef.current = false;
    }
  };

  useEffect(() => {
    if (!symbol) return;

    void fetchHistory(symbol, {
      useFallbackOnFailure: true,
      referencePrice: latestHistoryPriceRef.current,
    }).catch(() => undefined);
  }, [fetchHistory, symbol]);

  useEffect(() => {
    if (!symbol || !isUsingFallbackHistory || connectionState !== 'connected') {
      return;
    }

    void fetchHistory(symbol, {
      useFallbackOnFailure: false,
      referencePrice: latestHistoryPriceRef.current,
    }).catch(() => undefined);
  }, [connectionState, fetchHistory, isUsingFallbackHistory, symbol]);

  useEffect(() => {
    if (
      !symbol ||
      connectionState !== 'reconnecting' ||
      isUsingFallbackHistory
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      setHistory((current) =>
        current.length > 0 ? current : createMockHistory(symbol),
      );
      setIsUsingFallbackHistory(true);
    }, RECONNECT_FALLBACK_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [connectionState, isUsingFallbackHistory, symbol]);

  useEffect(() => {
    if (!symbol || !isUsingFallbackHistory) {
      return;
    }

    const interval = setInterval(() => {
      setHistory((current) => evolveMockHistory(current, symbol));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isUsingFallbackHistory, symbol]);

  useEffect(() => {
    if (!symbol || !ws) return;

    subscribeToTicker(ws, symbol);

    const handleMessage = (event: MessageEvent) => {
      const message = parseMarketDataMessage(event.data);

      if (message?.type === 'PRICE_UPDATE') {
        const update = message.data;

        if (update.symbol === symbol) {
          setHistory((prevHistory) => {
            const newHistory = [...prevHistory, update];
            if (newHistory.length > MAX_HISTORY_POINTS) {
              newHistory.shift();
            }
            return newHistory;
          });
        }
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      unsubscribeFromTicker(ws, symbol);
      ws.removeEventListener('message', handleMessage);
    };
  }, [symbol, ws]);

  return { history, isLoading, isUsingFallbackHistory, loadMoreHistory };
};
