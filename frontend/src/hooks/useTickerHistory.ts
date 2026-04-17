import { useState, useEffect } from 'react';
import axios from 'axios';
import { PriceUpdate } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';

export const useTickerHistory = (symbol: string | null) => {
  const [history, setHistory] = useState<PriceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { ws } = useWebSocket();

  useEffect(() => {
    if (!symbol) return;

    let isMounted = true;
    setIsLoading(true);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    axios.get(`${apiUrl}/api/tickers/history?symbol=${encodeURIComponent(symbol)}`)
      .then(res => {
        if (!isMounted) return;
        
        setHistory(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('History fetch error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !ws) return;

    const subscribe = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', ticker: symbol }));
      }
    };

    subscribe();

    const handleOpen = () => subscribe();
    ws.addEventListener('open', handleOpen);

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'PRICE_UPDATE') {
        const update = message.data as PriceUpdate;
        
        if (update.symbol === symbol) {
          setHistory(prevHistory => {
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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'UNSUBSCRIBE', ticker: symbol }));
      }
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
    };
  }, [symbol, ws]);

  return { history, isLoading };
};