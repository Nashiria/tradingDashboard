import { useState, useEffect, useRef } from 'react';
import { PriceUpdate } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';
import { marketDataApi } from '../services/marketDataApi';
import {
  parseMarketDataMessage,
  subscribeToTicker,
  unsubscribeFromTicker,
} from '../services/marketDataSocket';
import { createMockHistory } from '../services/mockMarketData';

export const useTickerHistory = (symbol: string | null) => {
  const [history, setHistory] = useState<PriceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUsingFallbackHistory, setIsUsingFallbackHistory] = useState(false);
  const isFetchingMoreRef = useRef(false);
  const { ws } = useWebSocket();

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
    } catch (e) {
      console.error('Failed to load older history:', e);
    } finally {
      isFetchingMoreRef.current = false;
    }
  };

  useEffect(() => {
    if (!symbol) return;

    let isMounted = true;
    setIsLoading(true);

    marketDataApi
      .getTickerHistory(symbol)
      .then((data) => {
        if (!isMounted) return;

        setHistory(data);
        setIsUsingFallbackHistory(false);
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setHistory(createMockHistory(symbol));
          setIsUsingFallbackHistory(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !ws) return;

    const subscribe = () => {
      subscribeToTicker(ws, symbol);
    };

    subscribe();

    const handleOpen = () => subscribe();
    ws.addEventListener('open', handleOpen);

    const handleMessage = (event: MessageEvent) => {
      const message = parseMarketDataMessage(event.data);

      if (message?.type === 'PRICE_UPDATE') {
        const update = message.data;

        if (update.symbol === symbol) {
          setHistory((prevHistory) => {
            const newHistory = [...prevHistory, update];
            if (newHistory.length > 600) {
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
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
    };
  }, [symbol, ws]);

  return { history, isLoading, isUsingFallbackHistory, loadMoreHistory };
};
