import { useState, useEffect } from 'react';
import { Ticker, PriceUpdate } from '../models/Ticker';
import { useWebSocket } from '../context/WebSocketContext';

export const useMarketData = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const { ws } = useWebSocket();

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'INITIAL_TICKERS') {
        setTickers(message.data);
      } else if (message.type === 'PRICE_UPDATE') {
        const update = message.data as PriceUpdate;
        setTickers(prevTickers => prevTickers.map(ticker => 
          ticker.symbol === update.symbol 
            ? { ...ticker, currentPrice: update.price } 
            : ticker
        ));
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  return { tickers };
};