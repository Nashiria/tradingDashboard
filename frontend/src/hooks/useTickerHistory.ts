import { useState, useEffect } from 'react';
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
  const { ws } = useWebSocket();

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

  return { history, isLoading, isUsingFallbackHistory };
};
